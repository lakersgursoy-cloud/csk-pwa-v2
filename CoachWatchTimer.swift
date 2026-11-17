import Foundation

// Pure timing state: shared by the watch UI and executable Swift tests, no Apple SDK needed.
struct CoachWatchLap: Codable, Identifiable {
  let id: UUID
  let number: Int
  let seconds: Double
  let totalSeconds: Double
  let recordedAt: Date
  let targetSeconds: Double?
  var submitted = false

  var delta: Double? { targetSeconds.map { ((seconds - $0) * 100).rounded() / 100 } }
  var pace: CoachWatchPace {
    guard let delta else { return .untargeted }
    if abs(delta) <= 0.5 { return .onTarget }
    return delta < 0 ? .faster : .slower
  }
  func canPrepare(at now: Date = Date()) -> Bool {
    !submitted && now.timeIntervalSince(recordedAt) <= 604800 && recordedAt.timeIntervalSince(now) <= 120
  }
}

enum CoachWatchPace { case untargeted, faster, onTarget, slower }

struct CoachWatchTimer: Codable {
  static let lapLimit = 100
  static let maximumElapsed: Double = 7 * 24 * 3600
  private(set) var elapsed: Double = 0
  private(set) var startedAt: Date?
  private(set) var laps: [CoachWatchLap] = []
  private(set) var targetSeconds: Double?

  var isRunning: Bool { startedAt != nil }
  var best: Double? { laps.map(\.seconds).min() }
  var average: Double? { laps.isEmpty ? nil : laps.reduce(0) { $0 + $1.seconds } / Double(laps.count) }
  func seconds(at now: Date) -> Double {
    min(Self.maximumElapsed, elapsed + (startedAt.map { max(0, now.timeIntervalSince($0)) } ?? 0))
  }
  func currentLapSeconds(at now: Date) -> Double { max(0, seconds(at: now) - (laps.last?.totalSeconds ?? 0)) }

  @discardableResult mutating func start(at now: Date) -> Bool {
    guard !isRunning else { return false }
    startedAt = now
    return true
  }
  @discardableResult mutating func stop(at now: Date) -> Bool {
    guard isRunning else { return false }
    elapsed = seconds(at: now); startedAt = nil
    return true
  }
  mutating func reset() {
    elapsed = 0; startedAt = nil; laps = []
  }
  @discardableResult mutating func setTarget(_ value: Double?) -> Bool {
    // A session has one explicitly chosen target. Past lap comparisons never change.
    guard !isRunning, elapsed == 0, laps.isEmpty else { return false }
    if let value, !value.isFinite || value < 1 || (value * 100).rounded() / 100 >= 3600 { return false }
    targetSeconds = value.map { ($0 * 100).rounded() / 100 }
    return true
  }
  @discardableResult mutating func lap(at now: Date, recordedAt: Date) -> CoachWatchLap? {
    guard isRunning, laps.count < Self.lapLimit else { return nil }
    let total = seconds(at: now)
    let duration = currentLapSeconds(at: now)
    // Debounce a repeated touch/gesture; don't create an empty or unsendable measurement.
    let rounded = (duration * 100).rounded() / 100
    guard duration >= 0.5, rounded > 0, rounded < 3600 else { return nil }
    let lap = CoachWatchLap(id: UUID(), number: laps.count + 1, seconds: rounded,
      totalSeconds: total, recordedAt: recordedAt, targetSeconds: targetSeconds)
    laps.append(lap)
    return lap
  }
  mutating func markSubmitted(_ id: UUID) {
    if let index = laps.firstIndex(where: { $0.id == id }) { laps[index].submitted = true }
  }
  static func restore(_ data: Data) -> CoachWatchTimer? {
    guard let state = try? JSONDecoder().decode(Self.self, from: data),
      state.elapsed.isFinite, (0...maximumElapsed).contains(state.elapsed),
      state.targetSeconds.map({ $0.isFinite && $0 >= 1 && $0 < 3600 }) ?? true,
      state.laps.count <= lapLimit, Set(state.laps.map(\.id)).count == state.laps.count else { return nil }
    var previous: Double = 0
    for (index, lap) in state.laps.enumerated() {
      guard lap.number == index + 1, lap.seconds.isFinite, lap.seconds >= 0.5, lap.seconds < 3600,
        lap.totalSeconds.isFinite, lap.totalSeconds > previous, lap.totalSeconds <= maximumElapsed,
        abs(lap.seconds - (lap.totalSeconds - previous)) <= 0.011,
        lap.targetSeconds == state.targetSeconds else { return nil }
      previous = lap.totalSeconds
    }
    guard state.isRunning || previous <= state.elapsed else { return nil }
    return state
  }
  static func migrating(elapsed: Double, startedAt: Date?) -> CoachWatchTimer {
    var timer = CoachWatchTimer()
    timer.elapsed = elapsed.isFinite ? min(maximumElapsed, max(0, elapsed)) : 0
    timer.startedAt = startedAt
    return timer
  }
}

// ContinuousClock includes suspension and ignores changes to the wall clock while this process lives.
// After process/device restart the persisted Date anchor resumes the timer (not official race timing).
struct CoachWatchTimebase {
  private let wall = Date()
  private let instant = ContinuousClock.now
  var now: Date {
    let duration = instant.duration(to: .now).components
    return wall.addingTimeInterval(Double(duration.seconds) + Double(duration.attoseconds) / 1e18)
  }
}

enum CoachWorkoutPhase: String, Codable { case ready, swim, rest, done }
struct CoachWorkoutLap: Codable, Identifiable {
  var id = UUID()
  let number: Int
  let seconds: Double
  let recordedAt: Date
  var submitted = false
  func canPrepare(at now: Date = Date()) -> Bool {
    !submitted && now.timeIntervalSince(recordedAt) <= 604800 && recordedAt.timeIntervalSince(now) <= 120
  }
}
struct CoachWorkout: Codable, Identifiable {
  var id = UUID()
  var plan = CoachWorkoutPlan()
  var athleteName = ""
  private(set) var phase = CoachWorkoutPhase.ready
  private(set) var anchor: Date? = nil
  private(set) var elapsed: Double = 0
  private(set) var laps: [CoachWorkoutLap] = []
  var active: Bool { phase == .swim || phase == .rest }
  var paused: Bool { active && anchor == nil }
  var meters: Int { laps.count * plan.distance }
  var best: Double { laps.map(\.seconds).min() ?? 0 }
  var average: Double { laps.isEmpty ? 0 : laps.reduce(0) { $0 + $1.seconds } / Double(laps.count) }
  var spread: Double { (laps.map(\.seconds).max() ?? 0) - best }
  var pace100: Double { average * 100 / Double(plan.distance) }
  var onTarget: Int { guard let target = plan.target else { return 0 }; return laps.filter { abs($0.seconds - target) <= 0.5 }.count }
  func seconds(at now: Date) -> Double { min(604800, elapsed + (anchor.map { max(0, now.timeIntervalSince($0)) } ?? 0)) }
  @discardableResult mutating func next(at now: Date, recordedAt: Date = Date()) -> Bool {
    guard plan.valid else { return false }
    if phase == .ready || (phase == .rest && anchor != nil && seconds(at: now) >= 0.5) {
      phase = .swim; anchor = now; elapsed = 0; return true
    }
    guard phase == .swim, anchor != nil, laps.count < plan.repetitions else { return false }
    let raw = seconds(at: now), rounded = (raw * 100).rounded() / 100
    guard raw >= 0.5, rounded < 3600 else { return false }
    laps.append(CoachWorkoutLap(number: laps.count + 1, seconds: rounded, recordedAt: recordedAt))
    phase = laps.count == plan.repetitions ? .done : .rest
    anchor = phase == .done ? nil : now; elapsed = 0
    return true
  }
  /// When the set rest is over, the next repeat starts by itself. The start is back-dated to the exact send-off
  /// (rest start + rest), so a late check — wrist down, app suspended, slow frame — never steals swim time.
  /// Returns false while resting, paused, without a rest interval or outside a rest.
  @discardableResult mutating func autoAdvance(at now: Date) -> Bool {
    guard plan.valid, plan.rest > 0, phase == .rest, let start = anchor, laps.count < plan.repetitions else { return false }
    let over = seconds(at: now) - Double(plan.rest)
    guard over >= 0 else { return false }
    phase = .swim; elapsed = 0; anchor = max(start, now.addingTimeInterval(-over)); return true
  }
  /// Whole seconds left in the rest (3, 2, 1 drive the wrist countdown); nil outside a running rest.
  func restRemaining(at now: Date) -> Int? {
    guard phase == .rest, anchor != nil, plan.rest > 0 else { return nil }
    return Int(ceil(Double(plan.rest) - seconds(at: now)))
  }
  /// Send-off of the next repeat, for a wrist alert while the app is not on screen.
  func sendOff(at now: Date) -> Date? {
    guard phase == .rest, anchor != nil, plan.rest > 0 else { return nil }
    return now.addingTimeInterval(Double(plan.rest) - seconds(at: now))
  }
  mutating func pause(at now: Date) {
    guard active, anchor != nil else { return }
    elapsed = seconds(at: now); anchor = nil
  }
  mutating func resume(at now: Date) { if paused { anchor = now } }
  mutating func finish() { phase = .done; anchor = nil; elapsed = 0 }
  mutating func markSubmitted(_ id: UUID) { if let i = laps.firstIndex(where: { $0.id == id }) { laps[i].submitted = true } }
  var valid: Bool {
    guard plan.valid, athleteName.utf16.count <= 120, elapsed.isFinite, (0...604800).contains(elapsed),
      laps.count <= plan.repetitions, Set(laps.map(\.id)).count == laps.count,
      anchor.map({ $0.timeIntervalSince1970.isFinite }) ?? true else { return false }
    if phase == .ready && (!laps.isEmpty || anchor != nil || elapsed != 0) { return false }
    if phase == .done && (anchor != nil || elapsed != 0) { return false }
    if phase == .rest && laps.isEmpty { return false }
    if active && laps.count >= plan.repetitions { return false }
    return laps.enumerated().allSatisfy { index, lap in
      lap.number == index + 1 && lap.seconds.isFinite && lap.seconds >= 0.5 && lap.seconds < 3600 && lap.recordedAt.timeIntervalSince1970.isFinite
    }
  }
  static func restore(_ data: Data) -> CoachWorkout? {
    guard let result = try? JSONDecoder().decode(Self.self, from: data), result.valid else { return nil }
    return result
  }
}

struct CoachLaneResult: Codable, Identifiable {
  var id = UUID()
  var name: String
  let repetition: Int
  let seconds: Double
  let recordedAt: Date
  var target: Double?
  var firstHalf: Double? = nil
  var best: Double? = nil
  var submitted = false
  var pace: CoachWatchPace {
    guard let target else { return .untargeted }
    let delta = ((seconds - target) * 100).rounded() / 100
    return abs(delta) <= 0.5 ? .onTarget : delta < 0 ? .faster : .slower
  }
}
// Each athlete is measured from the SAME round start, never from the previous athlete's finish.
struct CoachLaneSession: Codable {
  var plan: CoachWorkoutPlan? = nil
  var roster: [CoachRosterName] = []
  var round = 0
  private(set) var anchor: Date? = nil
  private(set) var elapsed: Double = 0
  private(set) var results: [CoachLaneResult] = []
  private(set) var splits: [String: Double]? = nil
  var completedNames: Set<String> { Set(results.filter { $0.repetition == round }.map(\.name)) }
  var roundComplete: Bool { !roster.isEmpty && completedNames.count == roster.count }
  func seconds(at now: Date) -> Double { min(604800, elapsed + (anchor.map { max(0, now.timeIntervalSince($0)) } ?? 0)) }
  @discardableResult mutating func start(at now: Date) -> Bool {
    guard !roster.isEmpty, roster.count <= 12, anchor == nil, (round == 0 || roundComplete), round < 100, results.count + roster.count <= 200 else { return false }
    round += 1; elapsed = 0; anchor = now; splits = [:]; return true
  }
  mutating func pause(at now: Date) { guard anchor != nil else { return }; elapsed = seconds(at: now); anchor = nil }
  mutating func resume(at now: Date) { if round > 0 && !roundComplete && anchor == nil { anchor = now } }
  @discardableResult mutating func finish(index: Int, at now: Date, recordedAt: Date = Date()) -> CoachLaneResult? {
    guard anchor != nil, roster.indices.contains(index), !completedNames.contains(roster[index].name) else { return nil }
    let raw = seconds(at: now), value = (raw * 100).rounded() / 100
    guard raw >= 0.5, value < 3600 else { return nil }
    // Different swimmers can finish within a fraction of a second. Duplicate athlete/round is rejected above.
    let athlete = roster[index]
    if let first = splits?[athlete.name], value - first < 0.5 { return nil }
    let result = CoachLaneResult(name: athlete.name, repetition: round, seconds: value, recordedAt: recordedAt, target: athlete.target, firstHalf: splits?[athlete.name], best: athlete.best)
    results.append(result)
    if roundComplete { pause(at: now) }
    return result
  }
  @discardableResult mutating func split(index: Int, at now: Date) -> Bool {
    guard plan?.distance == 100, anchor != nil, roster.indices.contains(index), !completedNames.contains(roster[index].name),
      splits?[roster[index].name] == nil else { return false }
    let value = seconds(at: now)
    guard value >= 0.5 && value < 3600 else { return false }
    if splits == nil { splits = [:] }; splits?[roster[index].name] = value; return true
  }
  @discardableResult mutating func correct(_ id: UUID, to index: Int) -> Bool {
    guard roster.indices.contains(index), let i = results.firstIndex(where: { $0.id == id }), !results[i].submitted,
      !results.contains(where: { $0.id != id && $0.repetition == results[i].repetition && $0.name == roster[index].name }) else { return false }
    results[i].name = roster[index].name; results[i].target = roster[index].target; results[i].best = roster[index].best; results[i].firstHalf = nil; return true
  }
  mutating func markSubmitted(_ id: UUID) { if let i = results.firstIndex(where: { $0.id == id }) { results[i].submitted = true } }
  var valid: Bool {
    guard plan.map({ $0.valid }) ?? true, roster.count <= 12,
      roster.allSatisfy({ !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.name.utf16.count <= 120
        && ($0.target.map { $0.isFinite && $0 >= 1 && $0 < 3600 } ?? true)
        && ($0.best.map { $0.isFinite && $0 >= 1 && $0 < 3600 } ?? true) }), Set(roster.map(\.name)).count == roster.count, (0...100).contains(round),
      elapsed.isFinite, (0...604800).contains(elapsed), results.count <= 200,
      Set(results.map(\.id)).count == results.count, anchor.map({ $0.timeIntervalSince1970.isFinite }) ?? true else { return false }
    return results.allSatisfy { result in
      roster.contains { $0.name == result.name } && result.seconds.isFinite && result.seconds >= 0.5 && result.seconds < 3600
        && (result.firstHalf.map { $0.isFinite && $0 >= 0.5 && result.seconds - $0 >= 0.5 } ?? true)
        && result.repetition >= 1 && result.repetition <= round && result.recordedAt.timeIntervalSince1970.isFinite
        && results.filter { $0.name == result.name && $0.repetition == result.repetition }.count == 1
    }
  }

}
struct CoachVoiceDraft {
  var id = UUID()
  var repetition: Int
  var seconds: Double
  var spokenName: String
  var candidates: [Int]
  static func normalized(_ value: String) -> String {
    value.lowercased(with: Locale(identifier: "tr_TR")).folding(options: .diacriticInsensitive, locale: Locale(identifier: "tr_TR"))
      .replacingOccurrences(of: "ı", with: "i").trimmingCharacters(in: .whitespacesAndNewlines)
  }
  static func parse(_ value: String, roster: [CoachRosterName]) -> CoachVoiceDraft? {
    guard value.utf16.count <= 500 else { return nil }
    let text = normalized(value).replacingOccurrences(of: "[.!?]+$", with: "", options: .regularExpression)
    let ordinal = "([0-9]{1,3}\\.?|birinci|ikinci|ucuncu|dorduncu|besinci|altinci|yedinci|sekizinci|dokuzuncu|onuncu)"
    let patterns = ["^" + ordinal + "\\s+tekrar\\s*[,;:]?\\s*(.+?)\\s*[,;:]?\\s+([0-9]{1,4}(?:[.,][0-9]{1,2})?)\\s*(?:saniye|sn)$",
      "^(.+?)\\s+" + ordinal + "\\s+tekrar\\s+([0-9]{1,4}(?:[.,][0-9]{1,2})?)\\s*(?:saniye|sn)$"]
    for (index, pattern) in patterns.enumerated() {
      guard let re = try? NSRegularExpression(pattern: pattern), let m = re.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) else { continue }
      func part(_ i: Int) -> String { Range(m.range(at: i), in: text).map { String(text[$0]) } ?? "" }
      let order = part(index == 0 ? 1 : 2).replacingOccurrences(of: ".", with: "")
      let ordinals = ["birinci", "ikinci", "ucuncu", "dorduncu", "besinci", "altinci", "yedinci", "sekizinci", "dokuzuncu", "onuncu"]
      let repetition = Int(order) ?? ordinals.firstIndex(of: order).map { $0 + 1 } ?? 0
      let name = part(index == 0 ? 2 : 1).trimmingCharacters(in: CharacterSet(charactersIn: ",;: "))
      guard (1...100).contains(repetition), let seconds = Double(part(3).replacingOccurrences(of: ",", with: ".")), seconds > 0, seconds < 3600 else { return nil }
      let exact = roster.indices.filter { normalized(roster[$0].name) == name }
      let candidates = exact.isEmpty ? roster.indices.filter { normalized(roster[$0].name).hasPrefix(name + " ") } : exact
      return CoachVoiceDraft(repetition: repetition, seconds: seconds, spokenName: name, candidates: candidates)
    }
    return nil
  }
}

struct CoachDepartures: Codable {
  var start: Date
  var interval: Int
  var count: Int
  func dates(after now: Date) -> [Date] {
    guard (10...600).contains(interval), (1...30).contains(count), start.timeIntervalSince1970.isFinite else { return [] }
    return (0..<count).map { start.addingTimeInterval(Double($0 * interval)) }.filter { $0 > now }
  }
  func next(at now: Date) -> (number: Int, date: Date)? {
    guard (10...600).contains(interval), (1...30).contains(count) else { return nil }
    for i in 0..<count {
      let date = start.addingTimeInterval(Double(i * interval))
      if date >= now { return (i + 1, date) }
    }
    return nil
  }
}

struct CoachLocalNote: Codable, Identifiable {
  var id = UUID(); var action: CoachWatchAction; var text: String; var createdAt = Date()
}
struct CoachAthleteBalance: Identifiable {
  var name: String; var laps: Int; var notes: Int
  var id: String { name }
}
enum CoachSessionInsights {
  static func splitSymbol(_ result: CoachLaneResult) -> String? {
    guard let first = result.firstHalf, first >= 0.5, result.seconds > first else { return nil }
    let delta = result.seconds - 2 * first
    return abs(delta) <= 0.05 ? "equal.circle" : delta < 0 ? "arrow.down.right.circle.fill" : "arrow.up.right.circle.fill"
  }
  static func declining(_ results: [CoachLaneResult], name: String) -> Bool {
    let rows = Array(results.filter { $0.name == name }.suffix(4))
    guard rows.count == 4 else { return false }
    return (1..<4).allSatisfy { rows[$0].repetition == rows[$0 - 1].repetition + 1 && rows[$0].seconds - rows[$0 - 1].seconds >= 0.995 }
  }
  static func declineCount(_ results: [CoachLaneResult]) -> Int {
    var count = 0
    for name in Set(results.map(\.name)) {
      let rows = results.filter { $0.name == name }
      for i in rows.indices where i >= 3 {
        if declining(Array(rows.prefix(i + 1)), name: name) && (i == 3 || !declining(Array(rows.prefix(i)), name: name)) { count += 1 }
      }
    }
    return count
  }
  static func balance(roster: [CoachRosterName], results: [CoachLaneResult], notes: [CoachLocalNote]) -> [CoachAthleteBalance] {
    roster.map { athlete in CoachAthleteBalance(name: athlete.name, laps: results.filter { $0.name == athlete.name }.count,
      notes: notes.filter { $0.action.name == athlete.name && ["TECHNIQUE","HEALTH","LESSON"].contains($0.action.kind) }.count) }
      .sorted { $0.laps + $0.notes < $1.laps + $1.notes }
  }
  static func personalBests(_ results: [CoachLaneResult]) -> Int {
    var previous: [String: Double] = [:]; var count = 0
    for r in results {
      if let best = previous[r.name] ?? r.best, r.seconds < best { count += 1 }
      if let best = previous[r.name] ?? r.best { previous[r.name] = min(best, r.seconds) }
    }
    return count
  }
}

enum CoachLaneRecovery {
  static func merge(_ existing: [CoachLaneResult], session: CoachLaneSession, now: Date) -> [CoachLaneResult] {
    var seen = Set<UUID>()
    return (existing + session.results).filter { r in
      !r.submitted && r.recordedAt.timeIntervalSince(now) <= 120 && now.timeIntervalSince(r.recordedAt) <= 604800
        && r.seconds.isFinite && r.seconds >= 0.5 && r.seconds < 3600 && seen.insert(r.id).inserted
    }
  }
}

struct CoachMeasureResult: Codable, Identifiable, Equatable {
  var id = UUID()
  let name: String
  let event: Int
  let seconds: Double
  let recordedAt: Date
  var split: Double? = nil
  var best: Double? = nil
  var last: Double? = nil
  var submitted = false
  /// Faster than every earlier comparable time.
  var personalBest: Bool { best.map { seconds < $0 } ?? false }
  /// Positive: faster than the reference by that many seconds.
  var gain: Double? { (best ?? last).map { (($0 - seconds) * 100).rounded() / 100 } }
}
/// After-attendance individual timing: one or two swimmers at a time, every event in the same order.
/// Each start is timed from its own tap. Pure and Foundation-only so the portable tests run it.
struct CoachMeasureRun: Codable, Equatable {
  private(set) var queue: CoachMeasureQueue
  private(set) var day: String
  private(set) var event = 0
  /// Swimmers still to measure in the current event, in order. Skipping moves a swimmer to the end.
  private(set) var order: [String]
  /// One swimmer, or two in neighbouring lanes started together.
  private(set) var lanes = 1
  private(set) var anchor: Date? = nil
  private(set) var swimming: [String] = []
  private(set) var splits: [String: Double] = [:]
  private(set) var results: [CoachMeasureResult] = []

  init(queue: CoachMeasureQueue, day: String) { self.queue = queue; self.day = day; order = queue.names }

  var current: String? { order.first }
  /// Who goes in the water on the next start.
  var nextUp: [String] { Array(order.prefix(lanes)) }
  var running: Bool { anchor != nil }
  var finished: Bool { event >= queue.events.count }
  var eventComplete: Bool { !finished && order.isEmpty }
  var currentEvent: CoachMeasureEvent? { queue.events.indices.contains(event) ? queue.events[event] : nil }
  var done: Int { results.filter { $0.event == event }.count }
  var started: Bool { !results.isEmpty || anchor != nil || event > 0 }
  /// Half-distance split, offered only when it falls on a wall (50 m in a 25 m pool → 25 m).
  var splitDistance: Int? {
    guard let e = currentEvent, e.distance % (2 * queue.pool) == 0 else { return nil }
    return e.distance / 2
  }
  func seconds(at now: Date) -> Double { anchor.map { min(3599.99, max(0, now.timeIntervalSince($0))) } ?? 0 }

  @discardableResult mutating func setLanes(_ value: Int) -> Bool {
    guard anchor == nil, (1...2).contains(value) else { return false }
    lanes = value; return true
  }
  @discardableResult mutating func start(at now: Date) -> Bool {
    guard !finished, anchor == nil, !order.isEmpty else { return false }
    swimming = nextUp; splits = [:]; anchor = now; return true
  }
  @discardableResult mutating func split(_ name: String, at now: Date) -> Bool {
    guard splitDistance != nil, anchor != nil, swimming.contains(name), splits[name] == nil else { return false }
    let value = (seconds(at: now) * 100).rounded() / 100
    guard value >= 1 else { return false }
    splits[name] = value; return true
  }
  /// Stops the clock for one swimmer in the water. When the last one is out, the next ones are ready.
  @discardableResult mutating func stop(_ name: String, at now: Date, recordedAt: Date = Date()) -> CoachMeasureResult? {
    guard anchor != nil, swimming.contains(name) else { return nil }
    let value = (seconds(at: now) * 100).rounded() / 100
    guard value >= 1, value < 3600, splits[name].map({ value - $0 >= 0.5 }) ?? true else { return nil }
    let mark = queue.mark(name, event: event)
    let result = CoachMeasureResult(name: name, event: event, seconds: value, recordedAt: recordedAt,
      split: splits[name], best: mark?.best, last: mark?.last)
    results.append(result)
    order.removeAll { $0 == name }; swimming.removeAll { $0 == name }; splits[name] = nil
    if swimming.isEmpty { anchor = nil; splits = [:] }
    return result
  }
  /// Single lane: the swimmer in the water.
  @discardableResult mutating func stop(at now: Date, recordedAt: Date = Date()) -> CoachMeasureResult? {
    guard let name = swimming.first else { return nil }
    return stop(name, at: now, recordedAt: recordedAt)
  }
  /// A false start: the clock is cleared and the same swimmers go again. Times already taken stay.
  mutating func cancel() { anchor = nil; swimming = []; splits = [:] }
  @discardableResult mutating func skip() -> Bool {
    guard anchor == nil, order.count > 1 else { return false }
    order.append(order.removeFirst()); return true
  }
  @discardableResult mutating func drop() -> Bool {
    guard anchor == nil, !order.isEmpty else { return false }
    order.removeFirst(); return true
  }
  @discardableResult mutating func undo() -> CoachMeasureResult? {
    guard anchor == nil, let last = results.last, last.event == event, !last.submitted else { return nil }
    results.removeLast(); order.insert(last.name, at: 0); return last
  }
  @discardableResult mutating func nextEvent() -> Bool {
    guard eventComplete else { return false }
    event += 1
    if !finished { order = queue.names }
    return true
  }
  mutating func markSubmitted(_ id: UUID) { if let i = results.firstIndex(where: { $0.id == id }) { results[i].submitted = true } }
  /// A late arrival marked on the phone joins the end; names already measured keep their times.
  mutating func update(_ next: CoachMeasureQueue) {
    let protected = Set(results.map(\.name)).union(swimming)
    let removed = Set(queue.names.filter { !next.names.contains($0) && !protected.contains($0) })
    let kept = queue.names.filter { !removed.contains($0) }
    // Never past 40 names, so the saved run always validates again on the next launch.
    let fresh = Array(next.names.filter { !queue.names.contains($0) }.prefix(max(0, 40 - kept.count)))
    let names = kept + fresh
    let events = started ? queue.events : next.events
    let source = started && next.events != queue.events ? (queue.marks ?? []) : (next.marks ?? [])
    let marks = source.filter { names.contains($0.name) && events.indices.contains($0.event) }
    queue = CoachMeasureQueue(at: next.at, pool: started ? queue.pool : next.pool, events: events, names: names, marks: marks)
    // Skips and drops made before the first swim are kept; a late arrival joins the end.
    if !finished { order = order.filter { !removed.contains($0) } + fresh }
  }
  func utterance(_ result: CoachMeasureResult) -> String? {
    guard queue.events.indices.contains(result.event) else { return nil }
    let e = queue.events[result.event]
    let text = { (v: Double) in String(format: "%.2f", locale: Locale(identifier: "tr_TR"), v) }
    let split = result.split.map { " · ara \(text($0))" } ?? ""
    return "\(e.distance) m \(e.stroke) · \(queue.pool) m havuz\(split), \(result.name), \(text(result.seconds)) saniye"
  }
  var valid: Bool {
    queue.valid(expiresAt: nil) && (0...queue.events.count).contains(event) && results.count <= 200 && (1...2).contains(lanes)
      && order.allSatisfy { queue.names.contains($0) } && Set(order).count == order.count
      && swimming.count <= lanes && swimming.allSatisfy { order.contains($0) } && (anchor == nil) == swimming.isEmpty
      && results.allSatisfy { queue.names.contains($0.name) && $0.seconds >= 1 && $0.seconds < 3600 && $0.event < queue.events.count }
  }
}

/// A measured time whose run has ended before the iPhone received it. Sent with its original id, so never twice.
struct CoachMeasureOrphan: Codable, Equatable {
  let id: UUID
  let text: String
  let createdAt: Date
  /// The phone refuses Watch drafts older than seven days.
  var expired: Bool { Date().timeIntervalSince(createdAt) > 6.5 * 86400 }
}
