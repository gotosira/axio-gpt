# Google Drive API Setup Guide

## 🔧 การตั้งค่า Google Cloud Console

### 1. เปิดใช้งาน Google Drive API

1. **ไปที่ Google Cloud Console**
   - เปิด https://console.cloud.google.com/
   - เลือกโปรเจค "UXUIDay2025" หรือสร้างใหม่

2. **เปิดใช้งาน Google Drive API**
   - ไปที่ **APIs & Services** > **Library**
   - ค้นหา "Google Drive API"
   - คลิก **Enable**

### 2. ตั้งค่า OAuth Consent Screen

1. **ไปที่ OAuth Consent Screen**
   - ไปที่ **APIs & Services** > **OAuth consent screen**
   - เลือก **External** (สำหรับ public app)
   - คลิก **Create**

2. **กรอกข้อมูล App Information**
   ```
   App name: AXIO-GPT
   User support email: Sira.Hanchana@gmail.com
   App logo: (optional)
   App domain: 
     - Application home page: http://localhost:3000
     - Application privacy policy: http://localhost:3000/privacy
     - Application terms of service: http://localhost:3000/terms
   Authorized domains: localhost
   Developer contact information: Sira.Hanchana@gmail.com
   ```

3. **เพิ่ม Scopes**
   - คลิก **Add or Remove Scopes**
   - เพิ่ม scopes ต่อไปนี้:
     ```
     https://www.googleapis.com/auth/drive.readonly
     https://www.googleapis.com/auth/userinfo.email
     https://www.googleapis.com/auth/userinfo.profile
     ```

### 3. ตั้งค่า OAuth 2.0 Client IDs

1. **ไปที่ Credentials**
   - ไปที่ **APIs & Services** > **Credentials**
   - คลิก **Create Credentials** > **OAuth 2.0 Client IDs**

2. **ตั้งค่า Web Application**
   ```
   Application type: Web application
   Name: AXIO-GPT Web Client
   
   Authorized JavaScript origins:
   - http://localhost:3000
   - https://yourdomain.com (ถ้ามี)
   
   Authorized redirect URIs:
   - http://localhost:3000/api/auth/callback/google
   - http://localhost:3000
   - https://yourdomain.com/api/auth/callback/google (ถ้ามี)
   ```

3. **บันทึก Client ID และ Client Secret**
   - คัดลอก **Client ID** และ **Client Secret**
   - อัปเดตใน `.env.local`

### 4. อัปเดต Environment Variables

เพิ่มใน `.env.local`:

```bash
# Google OAuth (ใช้ Client ID และ Secret จาก Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here
```

### 5. ตรวจสอบการตั้งค่า

1. **ตรวจสอบ Redirect URIs**
   - ต้องมี `http://localhost:3000/api/auth/callback/google`
   - ต้องมี `http://localhost:3000`

2. **ตรวจสอบ Scopes**
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

3. **ตรวจสอบ OAuth Consent Screen**
   - ต้องเป็น "External" type
   - ต้องมี scopes ที่ถูกต้อง

## 🚨 การแก้ไข Error 400: redirect_uri_mismatch

### สาเหตุ
- Redirect URI ที่ส่งไปไม่ตรงกับที่ตั้งค่าใน Google Cloud Console

### วิธีแก้ไข
1. ไปที่ **APIs & Services** > **Credentials**
2. คลิกที่ OAuth 2.0 Client ID ของคุณ
3. เพิ่ม Redirect URIs ต่อไปนี้:
   ```
   http://localhost:3000/api/auth/callback/google
   http://localhost:3000
   ```
4. บันทึกการเปลี่ยนแปลง
5. รอ 5-10 นาทีให้การตั้งค่าใหม่มีผล

## 🔍 การทดสอบ

1. **รีสตาร์ทเซิร์ฟเวอร์**
   ```bash
   npm run dev
   ```

2. **ทดสอบ Google Sign-in**
   - ไปที่ http://localhost:3000
   - คลิก "Sign in with Google"
   - ตรวจสอบว่าไม่มี error

3. **ทดสอบ Google Drive**
   - กดปุ่ม + 
   - เลือก "Add from Google Drive"
   - ตรวจสอบว่าเปิด Google Drive picker ได้

## 📋 Checklist

- [ ] เปิดใช้งาน Google Drive API
- [ ] ตั้งค่า OAuth Consent Screen
- [ ] เพิ่ม Scopes ที่จำเป็น
- [ ] ตั้งค่า OAuth 2.0 Client IDs
- [ ] เพิ่ม Redirect URIs ที่ถูกต้อง
- [ ] อัปเดต Environment Variables
- [ ] รีสตาร์ทเซิร์ฟเวอร์
- [ ] ทดสอบการทำงาน

## 🆘 การแก้ไขปัญหา

### Error: redirect_uri_mismatch
- ตรวจสอบ Redirect URIs ใน Google Cloud Console
- ต้องมี `http://localhost:3000/api/auth/callback/google`

### Error: access_denied
- ตรวจสอบ OAuth Consent Screen
- ตรวจสอบ Scopes ที่เพิ่ม

### Error: invalid_client
- ตรวจสอบ Client ID และ Client Secret
- ตรวจสอบ Environment Variables

### Error: scope_not_granted
- ตรวจสอบ Scopes ใน OAuth Consent Screen
- ต้องมี `https://www.googleapis.com/auth/drive.readonly`
