/* Demo veri — ÇSK PWA V2 */
const USERS = [
  { email: "yigit@cukurambar.com", name: "Yiğit Hoca", role: "yonetici", title: "Yönetici", mascot: "kanka" },
  { email: "sedanur@cukurambar.com", name: "Sedanur", role: "antrenor", title: "Antrenör / Kulvar", mascot: "kulvar" },
  { email: "nil@cukurambar.com", name: "Nil", role: "sporcu", title: "Sporcu / kAnka", mascot: "kanka" },
  { email: "pinar@cukurambar.com", name: "Pınar", role: "sporcu", title: "Dalga", mascot: "dalga" },
  { email: "veli.ada@cukurambar.com", name: "Ada Veli", role: "veli", title: "Veli", mascot: "kanka", child: "Ada Nilda" }
];

const TRAININGS = [
  { id: 1, date: "Bugün", time: "19:00 – 20:30", place: "MoveOn Oran", type: "Takım", coach: "Sedanur" },
  { id: 2, date: "Yarın", time: "18:00 – 19:30", place: "MoveOn Oran", type: "Masters", coach: "Yiğit Hoca" },
  { id: 3, date: "Cuma", time: "17:00 – 18:30", place: "Çukurambar Havuz", type: "Çocuk", coach: "Sedanur" }
];

const ATHLETES = [
  { name: "Nil Saraç", number: 18, group: "Takım" },
  { name: "Ada Nilda", number: 24, group: "Takım" },
  { name: "Pınar Gök", number: 5, group: "Dalga" },
  { name: "Güneş Kutlu", number: 2, group: "Takım" },
  { name: "Kübra Demir", number: 10, group: "Yetiskin" }
];

const NEWS = [
  { title: "5. Yıl Gecesi", text: "18 Eylül 2026 – Ankara’da sporcular ve ailelerle kutlandı." },
  { title: "Yeni Forma", text: "Siyah-zeytin mor dalga temalı yeni formalar sahada." }
];

function findUser(email) {
  return USERS.find(u => u.email.toLowerCase() === (email || "").toLowerCase());
}
