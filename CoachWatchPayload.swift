import Foundation

// Shared verbatim by the phone module and watch target. No credentials cross the link.
struct CoachWatchPayload: Codable, Identifiable {
  let id: String
  let linkId: String
  let utterance: String
  let createdAt: Double
  let action: CoachWatchAction?

  init?(dictionary: [String: Any], now: Date = Date()) {
    guard dictionary["contract"] as? String == "CSK_WATCH_DRAFT_V1",
          let id = dictionary["id"] as? String, UUID(uuidString: id) != nil,
          let link = dictionary["linkId"] as? String, UUID(uuidString: link) != nil,
          let text = dictionary["utterance"] as? String,
          !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, text.utf16.count <= 500,
          let at = dictionary["createdAt"] as? Double, at.isFinite,
          now.timeIntervalSince1970 * 1000 - at <= 604800000,
          at <= now.timeIntervalSince1970 * 1000 + 120000 else { return nil }
    var action: CoachWatchAction? = nil
    if let raw = dictionary["action"] {
      guard JSONSerialization.isValidJSONObject(raw), let data = try? JSONSerialization.data(withJSONObject: raw),
        let parsed = try? JSONDecoder().decode(CoachWatchAction.self, from: data), parsed.valid else { return nil }
      action = parsed
    }
    self.id = id.lowercased(); linkId = link; utterance = text; createdAt = at; self.action = action
  }

  var dictionary: [String: Any] {
    var value: [String: Any] = ["contract": "CSK_WATCH_DRAFT_V1", "id": id, "linkId": linkId,
     "utterance": utterance, "createdAt": createdAt]
    if let action, let data = try? JSONEncoder().encode(action), let raw = try? JSONSerialization.jsonObject(with: data) { value["action"] = raw }
    return value
  }
  var expired: Bool { Date().timeIntervalSince1970 * 1000 - createdAt > 604800000 }
}

struct CoachWorkoutPlan: Codable, Equatable {
  var repetitions = 8
  var distance = 50
  var pool = 25
  var stroke = "Serbest"
  var rest = 30
  var target: Double? = nil
  static let strokes = ["Serbest", "Sırtüstü", "Kurbağalama", "Kelebek", "Karışık"]
  var valid: Bool {
    (1...100).contains(repetitions) && [25, 50].contains(pool) && distance >= pool && distance <= 1500
      && distance % pool == 0 && Self.strokes.contains(stroke) && (0...600).contains(rest)
      && (target.map { $0.isFinite && $0 >= 1 && $0 < 3600 } ?? true)
  }
}
// Only the explicitly selected athlete name is sent, never the club roster.
struct CoachWatchKit: Codable, Equatable {
  var plan: CoachWorkoutPlan
  var athleteName: String
  var day: CoachWatchDay? = nil
  static func parse(_ value: String) -> CoachWatchKit? {
    guard value.utf8.count <= 60000, let data = value.data(using: .utf8),
      let kit = try? JSONDecoder().decode(Self.self, from: data), kit.plan.valid,
      kit.athleteName.utf16.count <= 120, kit.day.map({ $0.valid() }) ?? true else { return nil }
    return kit
  }
}

struct CoachRosterName: Codable, Equatable { var name: String; var target: Double?; var best: Double? = nil }
struct CoachRace: Codable, Equatable {
  var name: String; var heat: Int; var lane: Int; var distance: Int; var stroke: String; var location: String; var startsAt: Double?
}
/// One measured event of the after-attendance queue, e.g. 50 m Serbest.
struct CoachMeasureEvent: Codable, Equatable { var distance: Int; var stroke: String }
/// A swimmer's earlier comparable times for one event (push start, no fins, same pool), from the phone.
struct CoachMeasureMark: Codable, Equatable { var name: String; var event: Int; var best: Double?; var last: Double? }
/// Who came today, in the order they are measured, and when the Watch should call the coach.
/// Built on the phone from the attendance marks (present or late). Names only.
struct CoachMeasureQueue: Codable, Equatable {
  var at: Double?
  var pool: Int
  var events: [CoachMeasureEvent]
  var names: [String]
  var marks: [CoachMeasureMark]? = nil
  func mark(_ name: String, event: Int) -> CoachMeasureMark? { marks?.first { $0.name == name && $0.event == event } }
  func valid(expiresAt: Double?) -> Bool {
    let keys = names.map { $0.lowercased(with: Locale(identifier: "tr_TR")) }
    let time: (Double?) -> Bool = { $0.map { $0.isFinite && $0 >= 1 && $0 < 3600 } ?? true }
    guard (marks ?? []).count <= 160, (marks ?? []).allSatisfy({ m in names.contains(m.name) && events.indices.contains(m.event) && time(m.best) && time(m.last) })
    else { return false }
    return [25, 50].contains(pool) && (1...4).contains(events.count) && (1...40).contains(names.count)
      && Set(keys).count == keys.count
      && names.allSatisfy { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.utf16.count <= 120 }
      && events.allSatisfy { CoachWorkoutPlan.strokes.contains($0.stroke) && $0.stroke != "Karışık" && $0.distance >= pool && $0.distance <= 400 && $0.distance % pool == 0 }
      && (at.map { at in at.isFinite && (expiresAt.map { at >= $0 - 86400000 && at <= $0 } ?? true) } ?? true)
  }
}
struct CoachWatchDay: Codable, Equatable {
  var day: String; var expiresAt: Double; var roster: [CoachRosterName]; var races: [CoachRace]; var sendOff: Int?
  var cards: [CoachWatchCard]? = nil
  var measure: CoachMeasureQueue? = nil
  func valid(at now: Date = Date()) -> Bool {
    let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(secondsFromGMT: 10800); formatter.dateFormat = "yyyy-MM-dd"
    guard day == formatter.string(from: now), let midnight = formatter.date(from: day),
      expiresAt.isFinite, abs(expiresAt - (midnight.timeIntervalSince1970 * 1000 + 86400000 - 1)) < 1,
      expiresAt > now.timeIntervalSince1970 * 1000, roster.count <= 12, races.count <= 24,
      sendOff.map({ (10...600).contains($0) }) ?? true else { return false }
    guard (cards ?? []).count <= 100, (cards ?? []).allSatisfy({ $0.valid }) else { return false }
    guard measure.map({ $0.valid(expiresAt: expiresAt) }) ?? true else { return false }
    let names = roster.map { $0.name.lowercased(with: Locale(identifier: "tr_TR")) }
    guard Set(names).count == names.count else { return false }
    guard roster.allSatisfy({ !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.name.utf16.count <= 120
      && ($0.target.map { $0.isFinite && $0 >= 1 && $0 < 3600 } ?? true)
      && ($0.best.map { $0.isFinite && $0 >= 1 && $0 < 3600 } ?? true) }) else { return false }
    return races.allSatisfy { r in
      roster.contains(where: { $0.name == r.name }) && (1...99).contains(r.heat) && (0...10).contains(r.lane)
        && (1...1500).contains(r.distance) && r.stroke.utf16.count <= 40 && r.location.utf16.count <= 120
        && (r.startsAt.map { $0.isFinite && $0 >= expiresAt - 86400000 && $0 <= expiresAt } ?? true)
    }
  }
}

// Identity-free daily context; account authorization and ID resolution stay on the phone/server.
struct CoachWatchCard: Codable, Equatable {
  var kind: String; var name: String; var title: String; var detail: String
  var context: String = ""; var at: Double? = nil; var value: Double? = nil
  var valid: Bool {
    ["UNAVAILABLE","LICENSE","PAYMENT","ABSENCE","BIRTHDAY","HEALTH","LESSON","RACE","RESPONSE","ARRIVAL","LEAGUE","WATER","WEATHER"].contains(kind)
      && name.utf16.count <= 120 && title.utf16.count <= 160 && detail.utf16.count <= 500 && context.utf16.count <= 160
      && (at.map { $0.isFinite } ?? true) && (value.map { $0.isFinite } ?? true)
  }
}
struct CoachWatchAction: Codable, Equatable {
  var kind: String; var name: String; var context: String = ""; var relatedAt: Double? = nil; var value: Double? = nil
  var valid: Bool {
    ["TECHNIQUE","HEALTH","HEALTH_CLEAR","LESSON","RACE_RESULT","SELECT","ARRIVAL","PING","WARMUP","WATER","CALL_PARENT","SUMMARY"].contains(kind)
      && name.utf16.count <= 120 && context.utf16.count <= 160
      && (relatedAt.map { $0.isFinite } ?? true) && (value.map { $0.isFinite && abs($0) <= 10000 } ?? true)
      && (["WATER","WARMUP","SUMMARY"].contains(kind) || !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
  }
}

// Shared, Foundation-only policy used by the real Watch receiver and portable behavior tests.
struct CoachWatchLinkDecision {
  let enabled: Bool
  let wipe: Bool
  let signedOut: Bool
  let linkId: String?

  init(currentLink: String?, context: [String: Any]) {
    let next = context["linkId"] as? String
    let revoked = context["revoked"] as? String
    enabled = context["enabled"] as? Bool == true && next.flatMap(UUID.init(uuidString:)) != nil
    wipe = revoked == "ACCOUNT_CHANGED" || (enabled && currentLink != nil && next != currentLink)
    signedOut = revoked == "SIGNED_OUT" && !wipe
    linkId = enabled ? next : (wipe ? nil : currentLink)
  }

  static func removesDraft(acknowledgement: String) -> Bool {
    ["received", "saved", "discarded", "processed", "expired"].contains(acknowledgement)
  }
}
