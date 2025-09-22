# แก้ไข Google OAuth Testing Setup

## 🚨 ปัญหา
```
Access blocked: UXUIDay2025 has not completed the Google verification process
Error 403: access_denied
```

## 🔧 วิธีแก้ไข

### วิธีที่ 1: เพิ่ม Test Users (แนะนำสำหรับการทดสอบ)

1. **ไปที่ Google Cloud Console**
   - เปิด https://console.cloud.google.com/
   - เลือกโปรเจค "UXUIDay2025"

2. **ไปที่ OAuth Consent Screen**
   - ไปที่ **APIs & Services** > **OAuth consent screen**

3. **เพิ่ม Test Users**
   - ในส่วน **Test users** คลิก **+ ADD USERS**
   - เพิ่ม email: `Sira.Hanchana@gmail.com`
   - คลิก **Save**

4. **ตรวจสอบ Publishing Status**
   - ต้องเป็น **Testing** (ไม่ใช่ In production)
   - ต้องมี test users ที่เพิ่มไว้

### วิธีที่ 2: เปลี่ยนเป็น In Production (สำหรับ Production)

1. **ไปที่ OAuth Consent Screen**
2. **คลิก "Publish App"**
3. **ยืนยันการเผยแพร่**

**⚠️ หมายเหตุ:** การเผยแพร่ต้องผ่านการตรวจสอบจาก Google

## 📋 การตั้งค่าที่แนะนำ

### สำหรับการทดสอบ (Testing Mode):
- **Publishing Status**: Testing
- **Test Users**: เพิ่ม email ของคุณ
- **Scopes**: ใช้เฉพาะ scopes ที่จำเป็น

### สำหรับ Production:
- **Publishing Status**: In production
- **Verification**: ต้องผ่านการตรวจสอบจาก Google
- **Scopes**: ใช้ scopes ที่ผ่านการตรวจสอบแล้ว

## 🔍 ตรวจสอบการตั้งค่า

### ✅ ต้องมีใน OAuth Consent Screen:
- **App name**: AXIO-GPT
- **User support email**: Sira.Hanchana@gmail.com
- **Authorized domains**: localhost
- **Scopes**: 
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`
  - `https://www.googleapis.com/auth/drive.readonly`

### ✅ ต้องมีใน Credentials:
- **Authorized redirect URIs**:
  - `http://localhost:3000/api/auth/callback/google`
- **Authorized JavaScript origins**:
  - `http://localhost:3000`

## 🚨 สาเหตุที่พบบ่อย

1. **ไม่มี Test Users**
   - App อยู่ใน Testing mode แต่ไม่มี test users
   - ต้องเพิ่ม email ของคุณใน Test users

2. **App ยังไม่ผ่านการตรวจสอบ**
   - Google ยังไม่ตรวจสอบ app
   - ต้องใช้ Test users หรือรอการตรวจสอบ

3. **Scopes ไม่ถูกต้อง**
   - ใช้ scopes ที่ไม่ได้รับอนุญาต
   - ต้องใช้ scopes ที่ผ่านการตรวจสอบแล้ว

## 📋 Checklist การแก้ไข

- [ ] ไปที่ Google Cloud Console
- [ ] ไปที่ OAuth Consent Screen
- [ ] เพิ่ม Test Users (Sira.Hanchana@gmail.com)
- [ ] ตรวจสอบ Publishing Status
- [ ] ตรวจสอบ Scopes
- [ ] บันทึกการเปลี่ยนแปลง
- [ ] รอ 5-10 นาที
- [ ] ทดสอบการทำงาน

## 🆘 หากยังไม่ได้

1. **ตรวจสอบ Test Users**
   - ต้องมี email ของคุณใน Test users
   - ต้องใช้ email เดียวกันกับที่ login

2. **ตรวจสอบ Scopes**
   - ใช้เฉพาะ scopes ที่จำเป็น
   - อย่าใช้ scopes ที่ไม่ได้รับอนุญาต

3. **ล้าง Cache**
   - ล้าง browser cache
   - ลบ cookies ของ Google
   - ลองใช้ incognito mode

4. **ตรวจสอบ Console Logs**
   - เปิด Developer Tools
   - ดู Console tab สำหรับ error messages
