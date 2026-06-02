import { Lock } from 'lucide-react';

type AccountSecurityCardProps = {
  onChangePassword: () => void;
};

export default function AccountSecurityCard({ onChangePassword }: AccountSecurityCardProps) {
  return (
    <section
      id="account-security"
      className="overflow-hidden rounded-3xl border border-luxury-gold/16 bg-surface-lowest shadow-[0_14px_32px_rgba(125,6,51,0.06)]"
    >
      <div className="flex items-center gap-3 border-b border-luxury-gold/16 px-6 py-5 sm:px-7">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-primary/7 text-primary">
          <Lock className="h-[19px] w-[19px]" strokeWidth={2} />
        </div>
        <div>
          <h2 className="font-headline text-[17px] font-bold text-dark-charcoal">Security</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant/80">
            Update your sign-in password.
          </p>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:items-end sm:gap-x-9 sm:px-7 sm:py-7">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-on-surface-variant/80">
            Password
          </p>
          <p className="text-[15px] font-semibold tracking-widest text-dark-charcoal">••••••••••</p>
        </div>
        <div className="flex sm:justify-start">
          <button
            type="button"
            onClick={onChangePassword}
            className="inline-flex items-center gap-1.5 rounded-xl border-[1.5px] border-primary bg-transparent px-4 py-2 text-[13px] font-semibold text-primary transition-all hover:bg-primary hover:text-white"
          >
            <Lock className="h-4 w-4" strokeWidth={2} />
            Change password
          </button>
        </div>
      </div>
    </section>
  );
}
