# ÇSK Public API

Çukurambar Spor Kulübü'nün herkese açık kurumsal bilgilerini sunan salt okunur API ve MCP sunucusu. Veritabanı, gizli anahtar veya üye verisi yoktur. Telefon, ücret ve federasyon kodu içermez.

| Uç nokta | İçerik |
| --- | --- |
| `GET /health` | Sağlık kontrolü |
| `GET /api/club` | Kulüp kimliği, bağlantılar, projeler |
| `GET /api/programs` | Programlar ve yayımlanmış saatler |
| `GET /api/locations` | Kiralık veya ortak tesisler |
| `POST /mcp` | MCP Streamable HTTP (stateless) |

Bilgiler `data.json` dosyasındadır. Kulüp bilgisi değişince dosyayı ve `reviewed` tarihini güncelleyin.

## Yerel çalıştırma

```bash
npm ci
npm test
npm start
```

## Render

Yeni bir Web Service oluşturun. Mevcut servislere dokunmayın. Root Directory boş bırakılırsa kökteki `package.json` aynı servisi başlatır.

- Dal: `render-deploy`
- Root Directory: `server`
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/health`
- Plan: Free

Ücretsiz servis boşta kalınca uyur; ilk istek yavaş yanıtlanabilir. MCP istemcisine `https://<servis-adresi>/mcp` adresini verin.
