# Troubleshooting

Common issues and their solutions for the FairShare application.

## Authentication Issues

| Issue                      | Guide                                   | Description                                                |
| -------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Auto Logout After WebAuthn | [Auto Logout Fix](./AUTO_LOGOUT_FIX.md) | Resolving auto-logout issues after WebAuthn authentication |

## Common Problems

### Database Connection Issues

- **Error**: `Connection refused` or `Database not accessible`
- **Solution**: Check your `.env` file for correct database URLs
- **Reference**: [Prisma Setup](../setup/PRISMA_SETUP.md)

### NextAuth/Auth.js Session Issues

- **Error**: Session not persisting or user logged out immediately
- **Solution**: Verify Auth.js configuration and adapter setup
- **Reference**: [Auth.js Compliance](../setup/AUTHJS_COMPLIANCE.md)

### WebAuthn Registration Failures

- **Error**: Passkey registration fails or times out
- **Solution**: Ensure HTTPS in production and proper origin configuration
- **Reference**: [WebAuthn Implementation](../setup/WEBAUTHN_IMPLEMENTATION.md)

### TypeScript Errors

- **Error**: Type errors after Auth.js v5 migration
- **Solution**: Update type declarations and imports
- **Reference**: [Auth.js v5 Migration](../setup/AUTHJS_V5_MIGRATION.md)

## Getting Help

1. Check the relevant setup guide first
2. Review the troubleshooting documentation
3. Check the [Auth.js documentation](https://authjs.dev)
4. Verify environment variables and configuration

## Debug Mode

Enable debug logging by adding to your `.env`:

```bash
# Enable Auth.js debug logging
AUTH_DEBUG=true

# Enable Prisma query logging
DATABASE_URL="your-url?logging=true"
```
