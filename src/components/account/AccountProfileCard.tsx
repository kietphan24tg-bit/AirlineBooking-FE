import { SquarePen, User } from 'lucide-react';
import type { User as AppUser } from '../../types/user.type';
import { formatDobLabel, maskIdentifyNumber } from '../../utils/userDisplay';

type AccountProfileCardProps = {
  user: AppUser;
  nationalityLabel: string | null;
  onEdit: () => void;
};

type FieldProps = {
  label: string;
  value: string | null;
};

function ProfileField({ label, value }: FieldProps) {
  const empty = !value?.trim();

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-on-surface-variant/80">
        {label}
      </p>
      <p
        className={`text-[15px] font-semibold ${empty ? 'font-medium italic text-[#b0aaa2]' : 'text-dark-charcoal'}`}
      >
        {empty ? 'Chưa cập nhật' : value}
      </p>
    </div>
  );
}

export default function AccountProfileCard({
  user,
  nationalityLabel,
  onEdit,
}: AccountProfileCardProps) {
  const maskedId = maskIdentifyNumber(user.identifyNumber);

  return (
    <section className="overflow-hidden rounded-3xl border border-luxury-gold/16 bg-surface-lowest shadow-[0_14px_32px_rgba(125,6,51,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-luxury-gold/16 px-6 py-5 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-primary/7 text-primary">
            <User className="h-[19px] w-[19px]" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-headline text-[17px] font-bold text-dark-charcoal">
              Thông tin cá nhân
            </h2>
            <p className="mt-0.5 text-xs text-on-surface-variant/80">
              Dùng cho việc đặt vé và xuất vé điện tử.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-xl border-[1.5px] border-primary bg-transparent px-4 py-2 text-[13px] font-semibold text-primary transition-all hover:bg-primary hover:text-white"
        >
          <SquarePen className="h-4 w-4" strokeWidth={2} />
          Chỉnh sửa
        </button>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:gap-x-9 sm:px-7 sm:py-7">
        <ProfileField label="Họ" value={user.lastName} />
        <ProfileField label="Tên đệm & tên" value={user.firstName} />
        <ProfileField label="Email" value={user.email} />
        <ProfileField label="Số điện thoại" value={user.phone ?? null} />
        <ProfileField label="Ngày sinh" value={formatDobLabel(user.dob)} />
        <ProfileField label="Quốc tịch" value={nationalityLabel} />
        <ProfileField label="Số giấy tờ tùy thân" value={maskedId} />
      </div>
    </section>
  );
}
