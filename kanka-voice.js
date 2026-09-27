const MASKOTS = {
  kanka: { id: "kanka", name: "kAnka", role: "Ana maskot", pitch: 1.14, rate: 1.0, audio: "./audio/maskot-kanka.mp3", lines: { home: ["İki antrenman tamam. Bir tanesi kaldı. Seriyi birlikte kapatırız.", "Havuz çağırıyor. Ben de geldim. Gidelim mi?"], fall: ["Takıldık. Komik oldu. Kalk, bir tur daha."], parent: ["Bugün geldi. Sakin ol. Ben de izledim, işini yaptı."] } },
  kulvar: { id: "kulvar", name: "Kulvar", role: "Tempo / yoklama", pitch: 0.86, rate: 1.05, audio: "./audio/maskot-kulvar.mp3", lines: { home: ["Kronometre açık. Palet yok. Bahane yok.", "On sekiz isim. İşaretle. Geç."] } },
  dalga: { id: "dalga", name: "Dalga", role: "Yeni üye / nefes", pitch: 1.12, rate: 0.96, audio: "./audio/maskot-dalga.mp3", lines: { home: ["Su sana kızmaz. Gel, birlikte salınalım.", "Nefesini unutma. Ben yanındayım."] } },
  civi: { id: "civi", name: "Çivi", role: "Takım / kaptan", pitch: 0.9, rate: 1.08, audio: "./audio/maskot-civi.mp3", lines: { home: ["Üç kelime. Gel. Giyin. Atla.", "Konuşma havuzdan sonra."] } },
  kor: { id: "kor", name: "Kor", role: "Passport / damga", pitch: 1.22, rate: 1.04, audio: "./audio/maskot-yavru.mp3", lines: { home: ["Bugün geldin mi? Geldiysen tüyüm parlıyor.", "Henüz uçamam ama saymayı öğrendim."] } }
};
function mascotLine(id, kind) {
  const m = MASKOTS[id] || MASKOTS.kanka;
  const bank = m.lines[kind] || m.lines.home;
  return bank[Math.floor(Date.now() / 86400000) % bank.length];
}
function kankaSpeak(kind) { return mascotLine("kanka", kind); }
function pickMascot(user, screen) {
  if (screen === "yoklama" || screen === "coach") return "kulvar";
  if (screen === "team") return "civi";
  if (screen === "passport" || screen === "nest") return "kor";
  if (screen === "parent") return "kanka";
  if (user && (user.cardId === "pinar" || (user.title && user.title.indexOf("Özel") >= 0))) return "dalga";
  return "kanka";
}
