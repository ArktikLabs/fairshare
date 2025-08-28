# WebAuthn Integration Guide

This document outlines the WebAuthn (Web Authentication) implementation in FairShare, which enables passwordless authentication using biometrics, security keys, and other WebAuthn-compatible authenticators.

## 📋 Overview

WebAuthn has been successfully integrated into the FairShare application, providing:

- **Passwordless Authentication**: Use fingerprint, face recognition, or device PIN
- **Enhanced Security**: Cryptographic authentication without password vulnerabilities
- **Cross-Platform Support**: Works across devices and browsers that support WebAuthn
- **User-Friendly Experience**: Simple, fast authentication process

## 🏗️ Implementation Architecture

### Database Schema

The Prisma schema includes an `Authenticator` model to store WebAuthn credentials:

```prisma
model Authenticator {
  id                   String  @id @default(cuid())
  credentialID         String  @unique
  userId               String
  providerAccountId    String
  credentialPublicKey  String
  counter              Int
  credentialDeviceType String
  credentialBackedUp   Boolean
  transports           String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  // ... existing fields
  authenticators Authenticator[]
}
```

### API Routes

#### 1. Registration Endpoint (`/api/webauthn/register`)

- **GET**: Generates registration options for new passkey creation
- **POST**: Verifies and stores the new passkey credential

#### 2. Authentication Endpoint (`/api/webauthn/authenticate`)

- **POST**: Generates authentication options for existing passkeys
- **PUT**: Verifies passkey authentication and returns user data

### Frontend Components

#### 1. `useWebAuthn` Hook (`/src/hooks/useWebAuthn.ts`)

Custom React hook providing:

- `registerPasskey()`: Function to register a new passkey
- `authenticateWithPasskey(email)`: Function to authenticate with existing passkey
- Loading states and error handling

#### 2. `PasskeyManagement` Component (`/src/components/PasskeyManagement.tsx`)

Dashboard component for passkey registration:

- User-friendly interface for registering new passkeys
- Educational content about passkey benefits
- Success/error feedback

#### 3. Enhanced Sign-In Page (`/src/app/auth/signin/page.tsx`)

Updated authentication page with:

- Toggle between password and passkey authentication
- Integrated passkey sign-in flow
- Clear user guidance

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```env
# WebAuthn Configuration
AUTH_WEBAUTHN_RP_NAME="FairShare"
AUTH_WEBAUTHN_RP_ID="localhost"
AUTH_WEBAUTHN_RP_ORIGIN="http://localhost:3000"
```

For production, update these values:

```env
AUTH_WEBAUTHN_RP_ID="yourdomain.com"
AUTH_WEBAUTHN_RP_ORIGIN="https://yourdomain.com"
```

### Dependencies

The following packages are required:

- `@simplewebauthn/server@^9.0.2`: Server-side WebAuthn operations
- `@simplewebauthn/browser@^9.0.1`: Client-side WebAuthn operations

## 🚀 Usage Guide

### For End Users

#### Registering a Passkey

1. Sign in to your account using traditional credentials
2. Navigate to the Dashboard
3. Find the "Passkey Management" section
4. Click "Register Passkey"
5. Follow browser prompts to create your passkey

#### Signing In with Passkey

1. Go to the sign-in page
2. Click the "Passkey" tab
3. Enter your email address
4. Click "🔐 Sign in with Passkey"
5. Use your device's authentication method (fingerprint, face, PIN)

### For Developers

#### Testing WebAuthn

1. Use a compatible browser (Chrome, Firefox, Safari, Edge)
2. Test on `localhost` or HTTPS domains only
3. Ensure your device supports WebAuthn (most modern devices do)

#### Browser Compatibility

- ✅ Chrome 67+
- ✅ Firefox 60+
- ✅ Safari 14+
- ✅ Edge 18+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🔒 Security Features

### Authentication Flow

1. **Registration**: Creates a unique key pair for the user's device
2. **Authentication**: Uses cryptographic challenge-response
3. **Verification**: Server validates the response without storing passwords

### Security Benefits

- **Phishing Resistant**: Bound to specific domains
- **No Shared Secrets**: Private keys never leave the device
- **Replay Attack Prevention**: Each authentication includes a unique challenge
- **Device-Bound**: Credentials are tied to the specific device/authenticator

## 🛠️ Development Notes

### API Implementation Details

```typescript
// Registration flow
const options = await generateRegistrationOptions({
  rpName: "FairShare",
  rpID: "localhost",
  userID: user.id,
  userName: user.email,
  attestationType: "indirect",
  authenticatorSelection: {
    residentKey: "preferred",
    userVerification: "preferred",
    authenticatorAttachment: "platform",
  },
});
```

### Error Handling

- Network failures gracefully handled
- Browser compatibility checks
- Clear error messaging for users
- Fallback to traditional authentication

### Database Considerations

- Credentials stored as base64url encoded strings
- Counter tracking prevents replay attacks
- Cascade deletion when user is removed
- Indexed credential IDs for fast lookup

## 📱 Device Support

### Platform Authenticators

- **Windows**: Windows Hello (fingerprint, face, PIN)
- **macOS**: Touch ID, Face ID
- **iOS**: Touch ID, Face ID
- **Android**: Fingerprint, face unlock

### External Authenticators

- **FIDO2 Security Keys**: YubiKey, Titan Security Key
- **USB/NFC/Bluetooth**: Various FIDO Alliance certified devices

## 🚨 Troubleshooting

### Common Issues

#### "WebAuthn not supported"

- Update to a modern browser
- Ensure HTTPS or localhost environment
- Check device compatibility

#### Registration fails

- Clear browser data and try again
- Ensure sufficient storage space
- Try a different authenticator

#### Authentication fails

- Verify email address is correct
- Ensure the same device/browser used for registration
- Check for browser updates

### Development Issues

#### Type errors

- Run `pnpm db:generate` after schema changes
- Restart TypeScript language server
- Check SimpleWebAuthn version compatibility

#### API errors

- Verify environment variables are set
- Check database connection
- Review server logs for detailed errors

## 🎯 Future Enhancements

### Planned Features

- [ ] Multiple passkey support per user
- [ ] Passkey management (view, delete credentials)
- [ ] Cross-device passkey synchronization
- [ ] Admin dashboard for passkey analytics
- [ ] Backup authentication methods

### Security Improvements

- [ ] Advanced attestation verification
- [ ] Risk-based authentication
- [ ] Device trust scoring
- [ ] Anomaly detection

## 📚 Additional Resources

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [FIDO Alliance](https://fidoalliance.org/)
- [WebAuthn Browser Support](https://caniuse.com/webauthn)

---

**Note**: WebAuthn requires HTTPS in production environments. For development, `localhost` is permitted over HTTP.
