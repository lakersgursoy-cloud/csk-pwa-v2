import Foundation

var passed = 0
func check(_ name: String, _ body: () throws -> Void) rethrows {
  try body(); passed += 1; print("PASS: \(name)")
}
func near(_ actual: Double, _ expected: Double) { precondition(abs(actual - expected) < 0.0001, "\(actual) != \(expected)") }
let epoch = Date(timeIntervalSince1970: 1793480000)
func at(_ seconds: Double) -> Date { epoch.addingTimeInterval(seconds) }

check("unknown or temporarily unavailable phone link pauses without erasing unsent drafts") {
  let link = UUID().uuidString
  for context: [String: Any] in [["enabled": false], ["enabled": true, "linkId": "invalid"], [:]] {
    let decision = CoachWatchLinkDecision(currentLink: link, context: context)
    precondition(!decision.enabled && !decision.wipe && decision.linkId == link)
  }
}
check("sign-out preserves the Watch link and same-account sign-in resumes its queue") {
  let link = UUID().uuidString
  let paused = CoachWatchLinkDecision(currentLink: link, context: ["enabled": false, "revoked": "SIGNED_OUT"])
  precondition(paused.signedOut && !paused.wipe && !paused.enabled && paused.linkId == link)
  let resumed = CoachWatchLinkDecision(currentLink: paused.linkId, context: ["enabled": true, "linkId": link])
  precondition(resumed.enabled && !resumed.wipe && resumed.linkId == link)
}
check("only an explicit account change or a different valid link clears the old account queue") {
  let link = UUID().uuidString, other = UUID().uuidString
  let changed = CoachWatchLinkDecision(currentLink: link, context: ["enabled": false, "revoked": "ACCOUNT_CHANGED"])
  precondition(changed.wipe && changed.linkId == nil && !changed.enabled)
  let rebound = CoachWatchLinkDecision(currentLink: link, context: ["enabled": true, "linkId": other])
  precondition(rebound.wipe && rebound.enabled && rebound.linkId == other)
  let first = CoachWatchLinkDecision(currentLink: nil, context: ["enabled": true, "linkId": link])
  precondition(first.enabled && !first.wipe)
}
check("sign-out, storage errors and full phone queues never acknowledge away an unsent draft") {
  for status in ["signedOut", "storageError", "full", "unknown"] {
    precondition(!CoachWatchLinkDecision.removesDraft(acknowledgement: status))
  }
  for status in ["received", "saved", "discarded", "processed", "expired"] {
    precondition(CoachWatchLinkDecision.removesDraft(acknowledgement: status))
  }
}

check("rest ends by itself: the next repeat starts at the exact send-off, even when checked late") {
  var w = CoachWorkout(); w.plan = CoachWorkoutPlan(repetitions: 3, distance: 50, rest: 20)
  precondition(w.next(at: at(0))); precondition(w.next(at: at(31)))      // 1st repeat 31 s, rest starts at 31
  precondition(w.phase == .rest && w.restRemaining(at: at(48)) == 3)
  precondition(!w.autoAdvance(at: at(50.9)))                              // still resting
  near(w.sendOff(at: at(40))!.timeIntervalSince(epoch), 51)
  precondition(w.autoAdvance(at: at(57)))                                 // noticed 6 s late (wrist down)
  precondition(w.phase == .swim); near(w.seconds(at: at(57)), 6)          // swim clock counts from 51, not 57
  precondition(!w.autoAdvance(at: at(58)))
  precondition(w.next(at: at(81))); near(w.laps.last!.seconds, 30)
}
check("auto start respects pauses, zero rest and the last repeat") {
  var w = CoachWorkout(); w.plan = CoachWorkoutPlan(repetitions: 2, distance: 50, rest: 10)
  precondition(w.next(at: at(0))); precondition(w.next(at: at(30)))
  w.pause(at: at(35)); precondition(!w.autoAdvance(at: at(60)))          // paused rest never starts a repeat
  w.resume(at: at(60)); precondition(w.restRemaining(at: at(60)) == 5)
  precondition(w.autoAdvance(at: at(66))); near(w.seconds(at: at(66)), 1)
  precondition(w.next(at: at(96))); precondition(w.phase == .done && !w.autoAdvance(at: at(200)))
  var none = CoachWorkout(); none.plan = CoachWorkoutPlan(repetitions: 2, distance: 50, rest: 0)
  precondition(none.next(at: at(0))); precondition(none.next(at: at(30)))
  precondition(!none.autoAdvance(at: at(90)) && none.phase == .rest && none.restRemaining(at: at(90)) == nil)
}

check("paused time is excluded from totals and the next lap") {
  var timer = CoachWatchTimer()
  precondition(timer.start(at: at(0))); precondition(!timer.start(at: at(10)))
  near(timer.lap(at: at(25), recordedAt: at(25))!.seconds, 25)
  precondition(timer.stop(at: at(35))); precondition(!timer.stop(at: at(36)))
  near(timer.seconds(at: at(100)), 35)
  precondition(timer.start(at: at(100)))
  near(timer.lap(at: at(115), recordedAt: at(115))!.seconds, 25)
  near(timer.seconds(at: at(115)), 50)
}
check("duplicate input is debounced, recorded splits do not accumulate rounding drift") {
  var timer = CoachWatchTimer(); timer.start(at: at(0))
  precondition(timer.lap(at: at(0.2), recordedAt: at(0.2)) == nil)
  near(timer.lap(at: at(10.004), recordedAt: at(10.004))!.seconds, 10)
  precondition(timer.lap(at: at(10.2), recordedAt: at(10.2)) == nil)
  near(timer.lap(at: at(20.008), recordedAt: at(20.008))!.seconds, 10)
  near(timer.laps.last!.totalSeconds, 20.008)
}
try check("running session, target and stable lap identities survive process restoration") {
  var timer = CoachWatchTimer(); precondition(timer.setTarget(50)); timer.start(at: at(0))
  let lap = timer.lap(at: at(49.25), recordedAt: at(49.25))!
  timer.markSubmitted(lap.id)
  let restored = CoachWatchTimer.restore(try JSONEncoder().encode(timer))!
  near(restored.seconds(at: at(100)), 100)
  precondition(restored.laps.first!.id == lap.id && restored.laps.first!.submitted)
  precondition(!restored.laps.first!.canPrepare(at: at(100)))
  precondition(restored.targetSeconds == 50)
}
check("target comparisons include tolerance boundaries without changing historic targets") {
  for (time, pace) in [(49.49, CoachWatchPace.faster), (49.5, .onTarget), (50.5, .onTarget), (50.51, .slower)] {
    var timer = CoachWatchTimer(); precondition(timer.setTarget(50)); timer.start(at: at(0))
    precondition(!timer.setTarget(60))
    let lap = timer.lap(at: at(time), recordedAt: at(time))!
    precondition(lap.pace == pace)
    timer.stop(at: at(time)); precondition(!timer.setTarget(60))
    precondition(timer.laps.first!.targetSeconds == 50)
  }
}
check("invalid targets and unsendable long laps never become measurements") {
  var timer = CoachWatchTimer()
  for value in [Double.nan, .infinity, 0, -1, 3600, 3599.999] { precondition(!timer.setTarget(value)) }
  timer.start(at: at(0)); precondition(timer.lap(at: at(3600), recordedAt: at(3600)) == nil)
  near(timer.seconds(at: at(-10)), 0)
  near(timer.seconds(at: at(1e9)), CoachWatchTimer.maximumElapsed)
}
check("100 lap limit never overwrites old measurements; reset retains target") {
  var timer = CoachWatchTimer(); timer.setTarget(1); timer.start(at: at(0))
  for i in 1...100 { precondition(timer.lap(at: at(Double(i)), recordedAt: at(Double(i)))!.number == i) }
  let firstID = timer.laps.first!.id
  precondition(timer.lap(at: at(101), recordedAt: at(101)) == nil)
  precondition(timer.laps.count == 100 && timer.laps.first!.id == firstID)
  near(timer.best!, 1); near(timer.average!, 1)
  timer.stop(at: at(102)); timer.reset()
  precondition(timer.laps.isEmpty && !timer.isRunning && timer.elapsed == 0 && timer.targetSeconds == 1)
}
check("lap export keeps the capture day and UUID across delayed transmission") {
  var timer = CoachWatchTimer(); timer.start(at: at(0))
  let lap = timer.lap(at: at(51), recordedAt: at(51))!
  let dictionary: [String: Any] = ["contract": "CSK_WATCH_DRAFT_V1", "id": lap.id.uuidString,
    "linkId": UUID().uuidString, "utterance": "1. tekrar, Test Sporcu, 51 saniye", "createdAt": lap.recordedAt.timeIntervalSince1970 * 1000]
  let delayed = CoachWatchPayload(dictionary: dictionary, now: at(3600))!
  precondition(delayed.id == lap.id.uuidString.lowercased())
  near(delayed.createdAt, at(51).timeIntervalSince1970 * 1000)
  precondition(lap.canPrepare(at: at(604851)))
  precondition(!lap.canPrepare(at: at(604852)))
  precondition(!lap.canPrepare(at: at(-70)))
  precondition(CoachWatchPayload(dictionary: dictionary, now: at(604852)) == nil)
}
try check("malformed or inconsistent persisted histories are rejected") {
  precondition(CoachWatchTimer.restore(Data("broken".utf8)) == nil)
  var timer = CoachWatchTimer(); timer.start(at: at(0)); timer.lap(at: at(5), recordedAt: at(5)); timer.stop(at: at(5))
  let valid = try JSONEncoder().encode(timer)
  precondition(CoachWatchTimer.restore(valid) != nil)
  var dict = try JSONSerialization.jsonObject(with: valid) as! [String: Any]
  dict["elapsed"] = -1
  let negative = try JSONSerialization.data(withJSONObject: dict)
  precondition(CoachWatchTimer.restore(negative) == nil)
  dict["elapsed"] = 1
  let inconsistent = try JSONSerialization.data(withJSONObject: dict)
  precondition(CoachWatchTimer.restore(inconsistent) == nil)
  dict["elapsed"] = 5
  let laps = dict["laps"] as! [[String: Any]]
  dict["laps"] = laps + laps
  let duplicate = try JSONSerialization.data(withJSONObject: dict)
  precondition(CoachWatchTimer.restore(duplicate) == nil)
}
check("old stopwatch migrates without losing elapsed or running state") {
  let timer = CoachWatchTimer.migrating(elapsed: 20, startedAt: at(10))
  near(timer.seconds(at: at(30)), 40)
  near(CoachWatchTimer.migrating(elapsed: .nan, startedAt: nil).elapsed, 0)
}
check("live timebase is monotonic") {
  let timebase = CoachWatchTimebase()
  let first = timebase.now
  precondition(timebase.now >= first)
}
print("\(passed) Swift Watch timing tests passed.")

check("planned repeats exclude rest and paused swimming") {
  var workout = CoachWorkout(); workout.plan.repetitions = 2; workout.plan.target = 50
  precondition(workout.next(at: at(0)))
  workout.pause(at: at(10)); near(workout.seconds(at: at(100)), 10)
  precondition(!workout.next(at: at(100)))
  workout.resume(at: at(100)); precondition(workout.next(at: at(140), recordedAt: at(140)))
  near(workout.laps[0].seconds, 50); precondition(workout.phase == .rest)
  precondition(!workout.next(at: at(140.1)))
  near(workout.seconds(at: at(200)), 60)
  precondition(workout.next(at: at(200))); precondition(workout.next(at: at(250.5), recordedAt: at(250.5)))
  precondition(workout.phase == .done && workout.meters == 100 && workout.onTarget == 2)
  near(workout.average, 50.25); near(workout.pace100, 100.5); near(workout.spread, 0.5)
  precondition(!workout.next(at: at(300)))
}
check("paused rest, early stop and rapid touches never fabricate a swim result") {
  var workout = CoachWorkout(); workout.next(at: at(0))
  precondition(!workout.next(at: at(0.2))); precondition(!workout.next(at: at(3600)))
  workout.next(at: at(50)); workout.pause(at: at(60)); near(workout.seconds(at: at(120)), 10)
  workout.resume(at: at(120)); near(workout.seconds(at: at(140)), 30)
  workout.next(at: at(140)); workout.finish()
  precondition(workout.laps.count == 1 && workout.phase == .done && workout.anchor == nil)
}
try check("restoration preserves running phases, named athlete and submission identity") {
  var workout = CoachWorkout(); workout.athleteName = "Test Sporcu"; workout.next(at: at(0))
  workout.next(at: at(50), recordedAt: at(50)); let id = workout.laps[0].id; workout.markSubmitted(id)
  let restored = CoachWorkout.restore(try JSONEncoder().encode(workout))!
  near(restored.seconds(at: at(80)), 30)
  precondition(restored.laps[0].id == id && restored.laps[0].submitted && restored.athleteName == "Test Sporcu")
  precondition(!restored.laps[0].canPrepare(at: at(100)))
  var invalid = workout; invalid.plan.pool = 0
  let invalidData = try JSONEncoder().encode(invalid)
  precondition(CoachWorkout.restore(invalidData) == nil)
  precondition(CoachWorkout.restore(Data("broken".utf8)) == nil)
}
check("phone kit validates bounded plan and selected name, with no credentials or roster") {
  let good = #"{"plan":{"repetitions":8,"distance":50,"pool":25,"stroke":"Serbest","rest":30,"target":null},"athleteName":"Test Sporcu"}"#
  precondition(CoachWatchKit.parse(good) != nil)
  precondition(CoachWatchKit.parse(good.replacingOccurrences(of: "\"pool\":25", with: "\"pool\":0")) == nil)
  precondition(CoachWatchKit.parse(good.replacingOccurrences(of: "\"target\":null", with: "\"target\":3600")) == nil)
  precondition(CoachWatchKit.parse(good.replacingOccurrences(of: "Test Sporcu", with: String(repeating: "x", count: 121))) == nil)
}
print("\(passed) total Swift timing and workout tests passed.")

check("lane finishes share a common start, auto-order can be corrected before sending") {
  var lane = CoachLaneSession(roster: [CoachRosterName(name: "Çağan Yılmaz", target: 50), CoachRosterName(name: "İpek Öz", target: 55)])
  precondition(lane.start(at: at(0)))
  let first = lane.finish(index: 0, at: at(51), recordedAt: at(51))!
  precondition(first.pace == .slower); near(first.seconds, 51)
  precondition(lane.finish(index: 0, at: at(51.1), recordedAt: at(51.1)) == nil)
  precondition(lane.correct(first.id, to: 1)); precondition(lane.results[0].name == "İpek Öz")
  near(lane.finish(index: 0, at: at(55), recordedAt: at(55))!.seconds, 55)
  precondition(lane.roundComplete && lane.anchor == nil)
  precondition(!lane.correct(first.id, to: 0))
  lane.markSubmitted(first.id); precondition(!lane.correct(first.id, to: 1))
  precondition(lane.start(at: at(100))); precondition(lane.round == 2)
  lane.pause(at: at(110)); near(lane.seconds(at: at(200)), 10)
  lane.resume(at: at(200)); near(lane.finish(index: 0, at: at(240), recordedAt: at(240))!.seconds, 50)
  precondition(lane.valid)
}
check("voice matches either Turkish word order, preserves ambiguity and accepts decimal seconds") {
  let roster = [CoachRosterName(name: "Çağan Yılmaz", target: nil), CoachRosterName(name: "Çağan Can", target: nil), CoachRosterName(name: "İpek Öz", target: nil)]
  for text in ["Çağan üçüncü tekrar 51 saniye", "Üçüncü tekrar, Çağan, 51 saniye"] {
    let result = CoachVoiceDraft.parse(text, roster: roster)!
    precondition(result.candidates == [0, 1] && result.repetition == 3); near(result.seconds, 51)
  }
  let exact = CoachVoiceDraft.parse("Çağan Yılmaz 3. tekrar 51,25 saniye", roster: roster)!
  precondition(exact.candidates == [0]); near(exact.seconds, 51.25)
  precondition(CoachVoiceDraft.parse("İPEK ikinci tekrar 42 saniye", roster: roster)!.candidates == [2])
  precondition(CoachVoiceDraft.parse("Tanımadığım üçüncü tekrar 51 saniye", roster: roster)!.candidates.isEmpty)
  for text in ["Çağan üçüncü tekrar -51 saniye", "Çağan 0 tekrar 51 saniye", "Çağan üçüncü tekrar 3600 saniye", "Çağan 51 saniye", "Çağan üçüncü tekrar 51,123 saniye"] { precondition(CoachVoiceDraft.parse(text, roster: roster) == nil) }
}
check("daily roster expires at Istanbul midnight and rejects duplicate names and wrong race ownership") {
  let midnight = Date(timeIntervalSince1970: 1793473200) // 2026-11-01 00:00 Istanbul
  let formatter = DateFormatter(); formatter.dateFormat = "yyyy-MM-dd"; formatter.timeZone = TimeZone(secondsFromGMT: 10800)
  let dayText = formatter.string(from: midnight)
  let start = formatter.date(from: dayText)!
  var day = CoachWatchDay(day: dayText, expiresAt: start.timeIntervalSince1970 * 1000 + 86400000 - 1,
    roster: [CoachRosterName(name: "Test Sporcu", target: 51)], races: [], sendOff: 60)
  precondition(day.valid(at: start.addingTimeInterval(5)))
  precondition(!day.valid(at: start.addingTimeInterval(86400)))
  day.roster.append(day.roster[0]); precondition(!day.valid(at: start.addingTimeInterval(5)))
  day.roster.removeLast(); day.races = [CoachRace(name: "Unknown", heat: 4, lane: 3, distance: 50, stroke: "freestyle", location: "TOHM", startsAt: nil)]
  precondition(!day.valid(at: start.addingTimeInterval(5)))
}
check("send-off schedule stays anchored, skips missed alarms and is bounded") {
  let schedule = CoachDepartures(start: at(5), interval: 60, count: 8)
  precondition(schedule.dates(after: at(0)).count == 8)
  near(schedule.next(at: at(64))!.date.timeIntervalSince(epoch), 65)
  precondition(schedule.next(at: at(66))!.number == 3)
  precondition(schedule.next(at: at(426)) == nil)
  precondition(CoachDepartures(start: at(0), interval: 0, count: 8).dates(after: at(0)).isEmpty)
  precondition(CoachDepartures(start: at(0), interval: 60, count: 31).dates(after: at(0)).isEmpty)
}
print("\(passed) total Watch domain tests passed.")

check("three consecutive slowdowns alert once and missing rounds break the pattern") {
  let rows = [50.0,51,52,53,54].enumerated().map { i,s in CoachLaneResult(name:"Test",repetition:i+1,seconds:s,recordedAt:at(Double(i)*100),target:nil) }
  precondition(!CoachSessionInsights.declining(Array(rows.prefix(3)),name:"Test"))
  precondition(CoachSessionInsights.declining(Array(rows.prefix(4)),name:"Test"))
  precondition(CoachSessionInsights.declineCount(rows)==1)
  precondition(!CoachSessionInsights.declining([rows[0],rows[1],rows[3],rows[4]],name:"Test"))
}
check("100m split uses shared round start, pauses, and cannot be overwritten") {
  var plan=CoachWorkoutPlan();plan.distance=100
  var session=CoachLaneSession(plan:plan,roster:[CoachRosterName(name:"Test",target:100,best:99)])
  precondition(session.start(at:at(0)));precondition(session.split(index:0,at:at(51)))
  precondition(!session.split(index:0,at:at(52)))
  session.pause(at:at(60));session.resume(at:at(70))
  let result=session.finish(index:0,at:at(110),recordedAt:at(110))!
  near(result.firstHalf!,51);near(result.seconds,100)
  precondition(CoachSessionInsights.splitSymbol(result)=="arrow.down.right.circle.fill")
}
check("attention includes zero-touch athletes; PB requires a comparable previous record") {
  let roster=[CoachRosterName(name:"A",target:nil),CoachRosterName(name:"B",target:nil)]
  let rows=[CoachLaneResult(name:"A",repetition:1,seconds:50,recordedAt:at(50),target:nil,best:51),CoachLaneResult(name:"A",repetition:2,seconds:49,recordedAt:at(149),target:nil,best:51)]
  precondition(CoachSessionInsights.personalBests(rows)==2)
  precondition(CoachSessionInsights.personalBests([CoachLaneResult(name:"B",repetition:1,seconds:40,recordedAt:at(40),target:nil)])==0)
  let notes=[CoachLocalNote(action:CoachWatchAction(kind:"TECHNIQUE",name:"A"),text:"Turn observation")]
  let balance=CoachSessionInsights.balance(roster:roster,results:rows,notes:notes)
  precondition(balance[0].name=="B" && balance[0].laps==0 && balance[1].notes==1)
}
check("typed offline notes survive serialization without identity fields") {
  let raw:[String:Any] = ["contract":"CSK_WATCH_DRAFT_V1","id":UUID().uuidString,"linkId":UUID().uuidString,"createdAt":at(0).timeIntervalSince1970*1000,"utterance":"Turn observation","action":["kind":"TECHNIQUE","name":"Example","context":""]]
  let payload=CoachWatchPayload(dictionary:raw,now:at(2*86400))!
  precondition(payload.action?.kind=="TECHNIQUE")
  precondition(CoachWatchPayload(dictionary:payload.dictionary,now:at(2*86400))?.action==payload.action)
  precondition(CoachWatchPayload(dictionary:raw,now:at(7*86400+1))==nil)
}
check("measurement queue times one swimmer at a time, then the same order for the next stroke") {
 let queue=CoachMeasureQueue(at:nil,pool:25,events:[CoachMeasureEvent(distance:50,stroke:"Serbest"),CoachMeasureEvent(distance:50,stroke:"Sırtüstü")],names:["Ali","Bora","Can"])
 precondition(queue.valid(expiresAt:nil))
 var run=CoachMeasureRun(queue:queue,day:"2026-11-18")
 precondition(run.current=="Ali" && !run.started && run.stop(at:at(5))==nil)
 precondition(run.start(at:at(0)) && !run.start(at:at(1)))
 let ali=run.stop(at:at(38.123))!
 precondition(ali.name=="Ali" && ali.seconds==38.12 && ali.event==0 && run.current=="Bora" && !run.running)
 precondition(run.utterance(ali)=="50 m Serbest · 25 m havuz, Ali, 38,12 saniye" && ali.gain==nil && !ali.personalBest)
 precondition(run.start(at:at(100)))
 precondition(run.stop(at:at(100.5))==nil && run.running,"a sub-second tap is not a swim")
 precondition(run.stop(at:at(141))?.seconds==41 && run.current=="Can")
 precondition(run.start(at:at(200)) && run.stop(at:at(245)) != nil)
 precondition(run.eventComplete && !run.finished && run.start(at:at(300))==false)
 precondition(run.nextEvent() && run.currentEvent?.stroke=="Sırtüstü" && run.order==["Ali","Bora","Can"])
 for (i,name) in ["Ali","Bora","Can"].enumerated() {
  precondition(run.current==name && run.start(at:at(400+Double(i)*100)) && run.stop(at:at(445+Double(i)*100)) != nil)
 }
 precondition(run.nextEvent() && run.finished && run.results.count==6 && run.valid)
}
check("measurement queue: skip, false start, undo and leaving a stroke out") {
 let queue=CoachMeasureQueue(at:nil,pool:25,events:[CoachMeasureEvent(distance:50,stroke:"Serbest")],names:["Ali","Bora","Can"])
 var run=CoachMeasureRun(queue:queue,day:"d")
 precondition(run.skip() && run.order==["Bora","Can","Ali"])
 precondition(run.start(at:at(0))); precondition(!run.skip(),"no reordering while a swimmer is in the water")
 run.cancel(); precondition(!run.running && run.current=="Bora" && run.results.isEmpty)
 precondition(run.start(at:at(10)) && run.stop(at:at(50)) != nil && run.current=="Can")
 let back=run.undo()!; precondition(back.name=="Bora" && run.current=="Bora" && run.results.isEmpty)
 precondition(run.start(at:at(60)) && run.stop(at:at(99)) != nil)
 run.markSubmitted(run.results[0].id); precondition(run.undo()==nil,"a time already sent to the iPhone is corrected there")
 precondition(run.drop() && run.order==["Ali"])
 precondition(run.start(at:at(120)) && run.stop(at:at(160)) != nil && run.eventComplete)
}
check("measurement queue follows late attendance changes without losing times") {
 let first=CoachMeasureQueue(at:1,pool:25,events:[CoachMeasureEvent(distance:50,stroke:"Serbest")],names:["Ali","Bora"])
 var run=CoachMeasureRun(queue:first,day:"d")
 run.update(CoachMeasureQueue(at:2,pool:25,events:[CoachMeasureEvent(distance:25,stroke:"Kelebek")],names:["Bora","Can"]))
 precondition(run.order==["Bora","Can"] && run.queue.events[0].stroke=="Kelebek","before the first swim the phone list wins")
 precondition(run.start(at:at(0)) && run.stop(at:at(30)) != nil)
 run.update(CoachMeasureQueue(at:2,pool:50,events:[CoachMeasureEvent(distance:50,stroke:"Serbest")],names:["Can","Deniz"]))
 precondition(run.queue.events[0].stroke=="Kelebek" && run.queue.pool==25,"a started queue keeps its events")
 precondition(run.queue.names==["Bora","Can","Deniz"] && run.order==["Can","Deniz"],"a late arrival joins the end, a measured swimmer keeps the time")
 precondition(run.valid)
}
check("measurement queue packet is validated like the rest of the day") {
 let ok=CoachMeasureQueue(at:nil,pool:25,events:[CoachMeasureEvent(distance:50,stroke:"Serbest")],names:["Ali"])
 precondition(ok.valid(expiresAt:nil))
 var bad=ok; bad.names=["Ali","ali"]; precondition(!bad.valid(expiresAt:nil))
 bad=ok; bad.events=[CoachMeasureEvent(distance:50,stroke:"Karışık")]; precondition(!bad.valid(expiresAt:nil))
 bad=ok; bad.events=[]; precondition(!bad.valid(expiresAt:nil))
 bad=ok; bad.at=5000; precondition(!bad.valid(expiresAt:1000))
}
check("measurement queue: two lanes start together and stop one by one") {
 let queue=CoachMeasureQueue(at:nil,pool:25,events:[CoachMeasureEvent(distance:50,stroke:"Serbest")],names:["Ali","Bora","Can"])
 var run=CoachMeasureRun(queue:queue,day:"d")
 precondition(run.setLanes(2) && run.nextUp==["Ali","Bora"] && run.start(at:at(0)) && run.swimming==["Ali","Bora"])
 precondition(!run.setLanes(1),"lanes do not change mid-swim")
 precondition(run.stop("Bora",at:at(36))?.seconds==36 && run.running && run.swimming==["Ali"])
 precondition(run.stop("Bora",at:at(37))==nil,"one time per swimmer")
 precondition(run.stop("Ali",at:at(39))?.seconds==39 && !run.running && run.order==["Can"] && run.nextUp==["Can"])
 precondition(run.start(at:at(100)) && run.swimming==["Can"] && run.stop(at:at(140)) != nil && run.eventComplete && run.valid)
 var cancelled=CoachMeasureRun(queue:queue,day:"d"); _=cancelled.setLanes(2); _=cancelled.start(at:at(0)); _=cancelled.stop("Ali",at:at(30))
 cancelled.cancel(); precondition(cancelled.order==["Bora","Can"] && cancelled.results.count==1,"a false start keeps times already taken")
}
check("measurement queue: half-distance split on a wall and comparison with earlier times") {
 let marks=[CoachMeasureMark(name:"Ali",event:0,best:38,last:39),CoachMeasureMark(name:"Bora",event:0,best:nil,last:40)]
 let queue=CoachMeasureQueue(at:nil,pool:25,events:[CoachMeasureEvent(distance:50,stroke:"Serbest"),CoachMeasureEvent(distance:25,stroke:"Kelebek")],names:["Ali","Bora","Can"],marks:marks)
 precondition(queue.valid(expiresAt:nil))
 var run=CoachMeasureRun(queue:queue,day:"d")
 precondition(run.splitDistance==25 && run.start(at:at(0)) && !run.split("Ali",at:at(0.5)) && run.split("Ali",at:at(18.4)) && !run.split("Ali",at:at(19)))
 precondition(run.stop("Ali",at:at(18.6))==nil,"finish must be clearly after the split")
 let ali=run.stop("Ali",at:at(37.5))!
 precondition(ali.split==18.4 && ali.personalBest && ali.gain==0.5)
 precondition(run.utterance(ali)=="50 m Serbest · 25 m havuz · ara 18,40, Ali, 37,50 saniye")
 _=run.start(at:at(100)); let bora=run.stop(at:at(141))!
 precondition(!bora.personalBest && bora.gain == -1,"no best: compared with the last time")
 _=run.start(at:at(200)); let can=run.stop(at:at(240))!; precondition(can.gain==nil)
 precondition(run.nextEvent() && run.splitDistance==nil,"25 m in a 25 m pool has no wall split")
 var bad=queue; bad.marks=[CoachMeasureMark(name:"Deniz",event:0,best:30,last:nil)]; precondition(!bad.valid(expiresAt:nil))
 bad.marks=[CoachMeasureMark(name:"Ali",event:5,best:30,last:nil)]; precondition(!bad.valid(expiresAt:nil))
 bad.marks=[CoachMeasureMark(name:"Ali",event:0,best:0.2,last:nil)]; precondition(!bad.valid(expiresAt:nil))
}
print("\(passed) total Watch tests passed.")

check("different swimmers can finish within 250 ms without dropping a degree") {
 var lane=CoachLaneSession(roster:[CoachRosterName(name:"A",target:nil),CoachRosterName(name:"B",target:nil)])
 precondition(lane.start(at:at(0)))
 near(lane.finish(index:0,at:at(51),recordedAt:at(51))!.seconds,51)
 near(lane.finish(index:1,at:at(51.1),recordedAt:at(51.1))!.seconds,51.1)
 let unknown=[50.0,49].enumerated().map { i,s in CoachLaneResult(name:"A",repetition:i+1,seconds:s,recordedAt:at(Double(i)*100),target:nil) }
 precondition(CoachSessionInsights.personalBests(unknown)==0)
}
print("\(passed) total Watch tests passed.")

check("overnight recovery preserves unsent captures, deduplicates and expires after seven days") {
 var lane=CoachLaneSession(roster:[CoachRosterName(name:"A",target:nil),CoachRosterName(name:"B",target:nil)])
 precondition(lane.start(at:at(0)))
 let first=lane.finish(index:0,at:at(51),recordedAt:at(51))!
 let second=lane.finish(index:1,at:at(52),recordedAt:at(52))!
 lane.markSubmitted(second.id)
 let recovered=CoachLaneRecovery.merge([first],session:lane,now:at(86400))
 precondition(recovered.count==1 && recovered[0].id==first.id)
 precondition(CoachLaneRecovery.merge(recovered,session:lane,now:at(604853)).isEmpty)
}
print("\(passed) total Watch tests passed.")
