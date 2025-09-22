# แก้ไข Error 400: redirect_uri_mismatch

## 🚨 ปัญหา
```
Access blocked: UXUIDay2025's request is invalid
Error 400: redirect_uri_mismatch
```

## 🔧 วิธีแก้ไข

### 1. ไปที่ Google Cloud Console
- เปิด https://console.cloud.google.com/
- เลือกโปรเจค "UXUIDay2025"

### 2. ไปที่ OAuth 2.0 Client IDs
- ไปที่ **APIs & Services** > **Credentials**
- คลิกที่ OAuth 2.0 Client ID ของคุณ

### 3. แก้ไข Authorized redirect URIs
**เพิ่ม URI ต่อไปนี้:**
```
http://localhost:3000/api/auth/callback/google
```

**ตรวจสอบให้แน่ใจว่าไม่มี:**
- `http://localhost:3000/api/auth/callback/google/` (มี slash ต่อท้าย)
- `https://localhost:3000/api/auth/callback/google` (ใช้ https)
- `http://127.0.0.1:3000/api/auth/callback/google` (ใช้ 127.0.0.1)

### 4. แก้ไข Authorized JavaScript origins
**เพิ่ม origin ต่อไปนี้:**
```
http://localhost:3000
```

### 5. บันทึกการเปลี่ยนแปลง
- คลิก **Save**
- รอ 5-10 นาทีให้การตั้งค่าใหม่มีผล

### 6. ทดสอบการทำงาน
1. รีสตาร์ทเซิร์ฟเวอร์:
   ```bash
   npm run dev
   ```

2. ไปที่ http://localhost:3000

3. คลิก "Sign in with Google"

4. ตรวจสอบว่าไม่มี error

## 🔍 ตรวจสอบการตั้งค่า

### ✅ ต้องมีใน Google Cloud Console:
- **Authorized redirect URIs:**
  - `http://localhost:3000/api/auth/callback/google`
- **Authorized JavaScript origins:**
  - `http://localhost:3000`

### ✅ ต้องมีใน .env.local:
- `NEXTAUTH_URL=http://localhost:3000`
- `GOOGLE_CLIENT_ID=your-client-id`
- `GOOGLE_CLIENT_SECRET=your-client-secret`

## 🚨 สาเหตุที่พบบ่อย

1. **URI ไม่ตรงกัน**
   - NextAuth.js ใช้: `http://localhost:3000/api/auth/callback/google`
   - Google Cloud Console ตั้งค่า: `http://localhost:3000`

2. **มี slash ต่อท้าย**
   - ผิด: `http://localhost:3000/api/auth/callback/google/`
   - ถูก: `http://localhost:3000/api/auth/callback/google`

3. **ใช้ https แทน http**
   - ผิด: `https://localhost:3000/api/auth/callback/google`
   - ถูก: `http://localhost:3000/api/auth/callback/google`

4. **ใช้ 127.0.0.1 แทน localhost**
   - ผิด: `http://127.0.0.1:3000/api/auth/callback/google`
   - ถูก: `http://localhost:3000/api/auth/callback/google`

## 📋 Checklist การแก้ไข

- [ ] ไปที่ Google Cloud Console
- [ ] ไปที่ OAuth 2.0 Client IDs
- [ ] เพิ่ม `http://localhost:3000/api/auth/callback/google` ใน Authorized redirect URIs
- [ ] เพิ่ม `http://localhost:3000` ใน Authorized JavaScript origins
- [ ] บันทึกการเปลี่ยนแปลง
- [ ] รอ 5-10 นาที
- [ ] รีสตาร์ทเซิร์ฟเวอร์
- [ ] ทดสอบการทำงาน

## 🆘 หากยังไม่ได้

1. **ตรวจสอบ OAuth Consent Screen**
   - ไปที่ **APIs & Services** > **OAuth consent screen**
   - ตรวจสอบว่า App name และ domains ถูกต้อง

2. **ตรวจสอบ Scopes**
   - ต้องมี `https://www.googleapis.com/auth/userinfo.email`
   - ต้องมี `https://www.googleapis.com/auth/userinfo.profile`

3. **ล้าง Cache**
   - ล้าง browser cache
   - ลบ cookies ของ localhost
   - ลองใช้ incognito mode

4. **ตรวจสอบ Console Logs**
   - เปิด Developer Tools
   - ดู Console tab สำหรับ error messages
