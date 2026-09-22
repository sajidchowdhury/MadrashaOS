/**
 * MadrashaOS — Ambient Module Declarations for Optional Dependencies
 *
 * Phase 4 (P4-LIBS-1)
 *
 * Some libraries are optional peer dependencies — they're only required
 * when a specific provider is selected (e.g. nodemailer only when
 * NOTIFICATION_PROVIDER=smtp). We don't bundle them in the default dev
 * install to keep `bun install` fast and the production image small.
 *
 * To still get type safety at compile time (and avoid TS7016 "Could not
 * find a declaration file for module 'nodemailer'"), we declare
 * minimal ambient module shapes here. When the package IS installed,
 * its bundled .d.ts takes precedence (TS picks the most specific
 * declaration).
 *
 * If you actually use the SMTP provider in production, run
 * `bun add nodemailer @types/nodemailer` — those real types will
 * shadow these ambient ones automatically.
 */

declare module "nodemailer" {
  export interface Transporter {
    sendMail(options: {
      from?: string;
      to?: string;
      cc?: string;
      bcc?: string;
      subject?: string;
      text?: string;
      html?: string;
      replyTo?: string;
      attachments?: Array<{
        filename: string;
        content: Buffer | Uint8Array;
        contentType?: string;
        cid?: string;
      }>;
    }): Promise<{ messageId: string }>;
    verify?(): Promise<true>;
  }

  export interface TransportOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
  }

  export function createTransport(opts: TransportOptions): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
