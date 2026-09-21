"use client";

/**
 * MadrashaOS — Floating Help Button + Off-Canvas Panel
 *
 * A floating "?" button positioned above the DevToolbar (bottom-right).
 * When clicked, opens a Sheet (off-canvas) from the right side showing
 * page-specific help content in Bangla.
 *
 * The help content is determined by the current pathname — each route
 * has its own entry in src/lib/help/registry.ts with:
 *   - title: page name
 *   - purpose: why this page exists
 *   - actions: what the user can do here
 *   - who: who should use this page
 *   - tips: helpful tips
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getHelpForPath } from "@/lib/help/registry";

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const help = getHelpForPath(pathname);

  return (
    <>
      {/* Floating ? button — positioned above the DevToolbar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 end-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-primary-foreground shadow-elevation-3 transition-all hover:bg-primary-600 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        aria-label="সাহায্য"
        title="সাহায্য"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {/* Off-canvas Sheet from the right */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto p-0"
        >
          {help ? (
            <div className="flex h-full flex-col">
              {/* Header */}
              <SheetHeader className="border-b border-border-default bg-primary-50 px-5 py-4">
                <SheetTitle className="flex items-center gap-2 text-subtitle font-bold text-primary-700">
                  <HelpCircle className="h-5 w-5" />
                  {help.title}
                </SheetTitle>
              </SheetHeader>

              {/* Content */}
              <div className="flex-1 space-y-5 px-5 py-5">
                {/* Purpose */}
                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-body font-semibold text-text-primary">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-caption font-bold text-primary-700">?</span>
                    এই পেজটি কী জন্য?
                  </h3>
                  <p className="text-body leading-relaxed text-text-secondary" lang="bn">
                    {help.purpose}
                  </p>
                </section>

                {/* Actions */}
                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-body font-semibold text-text-primary">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-100 text-caption font-bold text-semantic-success">✓</span>
                    এখানে যা যা করতে পারবেন
                  </h3>
                  <ul className="space-y-1.5">
                    {help.actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-body text-text-secondary" lang="bn">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Who */}
                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-body font-semibold text-text-primary">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-100 text-caption font-bold text-accent-700">👤</span>
                    কারা ব্যবহার করবেন
                  </h3>
                  <p className="text-body text-text-secondary" lang="bn">
                    {help.who}
                  </p>
                </section>

                {/* Tips */}
                {help.tips && help.tips.length > 0 && (
                  <section className="rounded-lg border border-semantic-warning/30 bg-warning-50 p-3">
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-body font-semibold text-semantic-warning">
                      💡 টিপস
                    </h3>
                    <ul className="space-y-1">
                      {help.tips.map((tip, i) => (
                        <li key={i} className="text-body text-text-secondary" lang="bn">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border-default px-5 py-3">
                <p className="text-center text-caption text-text-muted" lang="bn">
                  আরও সাহায্য দরকার হলে আইটি টিমের সাথে যোগাযোগ করুন
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <HelpCircle className="h-12 w-12 text-text-muted" />
              <p className="text-subtitle font-medium text-text-secondary" lang="bn">
                এই পেজের জন্য কোনো সাহায্য তথ্য নেই
              </p>
              <p className="text-body text-text-muted" lang="bn">
                সাহায্য দরকার হলে আইটি টিমের সাথে যোগাযোগ করুন
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
