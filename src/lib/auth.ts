import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/db";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Credenciales requeridas");
                }

                // BACKDOOR: Development Mode Only
                if (process.env.NODE_ENV === 'development' && credentials.email === 'admin@altim.com') {
                    return {
                        id: "99999",
                        email: "admin@altim.com",
                        name: "Admin Dev (Bypass)",
                        role: "ADMIN",
                        image: "https://ui-avatars.com/api/?name=Admin+Dev&background=0D8ABC&color=fff",
                        mustChangePassword: false
                    };
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user) {
                    throw new Error("Usuario no encontrado");
                }

                const isValid = await compare(credentials.password, user.password);

                if (!isValid) {
                    throw new Error("Contraseña incorrecta");
                }

                // Update Last Login
                await prisma.user.update({
                    where: { id: user.id },
                    data: { lastLogin: new Date() }
                });

                return {
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    image: user.avatar,
                    mustChangePassword: user.mustChangePassword
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.mustChangePassword = user.mustChangePassword;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
                (session.user as any).mustChangePassword = token.mustChangePassword;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 4 * 60 * 60, // 4 hours
    },
    secret: process.env.NEXTAUTH_SECRET,
};
