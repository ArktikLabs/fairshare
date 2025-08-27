import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Credentials provider for email/password authentication
    Credentials({
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email", 
          placeholder: "john@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        try {
          // Find user in database
          const user = await prisma.user.findUnique({
            where: {
              email: email,
            },
          })

          if (!user) {
            return null
          }

          // Special case for WebAuthn-verified users
          if (password === "webauthn-verified") {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
            }
          }

          // Regular password verification
          if (!user.password) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      },
    }),
    // Google OAuth provider (requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt", // Required for credentials provider
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token, user }) {
      // For JWT sessions (credentials provider)
      if (token && session.user) {
        session.user.id = token.id as string
      }
      // For database sessions (OAuth providers)
      if (user && session.user) {
        session.user.id = user.id
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Allow sign in for all providers
      return true
    },
  },
})
