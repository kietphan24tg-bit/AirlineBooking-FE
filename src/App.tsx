import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import Select from 'react-select';
import './App.css';
const countries = [
  { label: 'Việt Nam', value: 'VN' },
  { label: 'Hoa Kỳ', value: 'US' },
  { label: 'Nhật Bản', value: 'JP' },
  { label: 'Hàn Quốc', value: 'KR' },
];
/**
 * LoginPage — The Sovereign Experience
 * Built strictly following DESIGN.md: "The Digital Concierge"
 *
 * Add to index.html:
 * <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;700;900&family=Manrope:wght@300;400;600;700&display=swap" rel="stylesheet"/>
 * <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0" rel="stylesheet"/>
 */

// ── Design Tokens (DESIGN.md §2) ─────────────────────────────────────────────
const t = {
  primary: '#a12428',
  primaryContainer: '#c33d3d',
  onPrimary: '#ffffff',
  secondary: '#765a17',
  secondaryFixed: '#ffdf9e',
  surface: '#f9f9f9',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f3f3',
  surfaceContainer: '#eeeeee',
  surfaceContainerHighest: '#e2e2e2',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#5d3f3c',
  outlineVariant: '#e6bdb8',
  // Ambient shadow — onSurface tint, never pure black (DESIGN.md §4)
  shadow: '0 12px 40px rgba(26, 28, 28, 0.06)',
  // Ghost border — outlineVariant at 15% opacity (DESIGN.md §4)
  ghostBorder: '1px solid rgba(230, 189, 184, 0.15)',
};

const font = {
  headline: "'Be Vietnam Pro', sans-serif",
  body: "'Manrope', sans-serif",
};

const sovereignStyles = {
  control: (base: any) => ({
    ...base,
    width: 'auto',
    background: t.surfaceContainerHighest,
    border: 'none',
    borderRadius: '0.375rem',
    padding: '0.5rem 1rem',
    fontFamily: font.body,
    fontSize: '0.9375rem',
    color: t.onSurface,
    outline: 'none',
    boxSizing: 'border-box',
  }),

  menu: (base: any) => ({
    ...base,
    background: '#ffffff',
    borderRadius: '0.375rem',
    border: '1px solid rgba(230, 189, 184, 0.3)',
    boxShadow: '0 12px 40px rgba(26, 28, 28, 0.08)',
  }),

  option: (base: any, state: any) => ({
    ...base,
    display: 'flex',
    justifyContent: 'space-between',
    background: state.isSelected
      ? '#fef9f0' // item đang chọn → vàng nhạt
      : state.isFocused
        ? '#f3f3f3' // hover
        : 'transparent',
    color: '#1a1c1c',
    fontSize: '0.875rem',
    cursor: 'pointer',
  }),

  singleValue: (base: any) => ({
    ...base,
    color: '#1a1c1c',
    fontFamily: "'Manrope', sans-serif",
    fontSize: '0.9375rem',
  }),

  placeholder: (base: any) => ({
    ...base,
    color: 'rgba(93, 63, 60, 0.4)',
    fontFamily: "'Manrope', sans-serif",
  }),

  input: (base: any) => ({
    ...base,
    color: '#1a1c1c',
    fontFamily: "'Manrope', sans-serif",
  }),

  clearIndicator: (base: any) => ({
    ...base,
    color: '#5d3f3c',
    '&:hover': { color: '#1a1c1c' },
  }),

  dropdownIndicator: (base: any) => ({
    ...base,
    color: '#5d3f3c',
  }),

  indicatorSeparator: () => ({ display: 'none' }),
};
// Primary gradient (DESIGN.md §2 Glass & Gradient Rule)
const primaryGradient = `linear-gradient(135deg, ${t.primary}, ${t.primaryContainer})`;

// Gold decorative pattern (right panel background texture)
const goldPattern = `
  linear-gradient(135deg, transparent 45%, rgba(118,90,23,0.05) 45%, rgba(118,90,23,0.05) 46%, transparent 46%),
  linear-gradient(135deg, transparent 48%, rgba(118,90,23,0.08) 48%, rgba(118,90,23,0.08) 50%, transparent 50%)
`;

// ── Sub-components ────────────────────────────────────────────────────────────

/** DESIGN.md §3 Labels: Manrope, ALL CAPS, 0.05rem tracking, 0.6875rem */
type FieldLabelProps = {
  children: React.ReactNode;
  htmlFor?: string;
};

function FieldLabel({ children, htmlFor }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontFamily: font.body,
        fontSize: '0.6875rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05rem',
        color: t.onSurfaceVariant,
        display: 'block',
        marginBottom: '0.3rem',
        marginLeft: '0.2rem',
      }}
    >
      {children}
    </label>
  );
}

/** DESIGN.md §5 Booking Inputs: surfaceContainerHighest, no border, gold glow on focus */
type BookingInputProps = {
  id: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: Dispatch<SetStateAction<string>>;
};

function BookingInput({ id, type = 'text', placeholder, value, onChange }: BookingInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        background: t.surfaceContainerHighest,
        border: 'none',
        borderRadius: '0.375rem',
        padding: '1rem 1.125rem',
        fontFamily: font.body,
        fontSize: '0.9375rem',
        color: t.onSurface,
        outline: 'none',
        boxSizing: 'border-box',
        // DESIGN.md §5 Focus State: secondaryFixed at 50%
        boxShadow: focused ? '0 0 0 2px rgba(255, 223, 158, 0.5)' : 'none',
        transition: 'box-shadow 0.2s ease',
      }}
    />
  );
}

/** DESIGN.md §5 Primary Button: gradient, hover +2px + ambient shadow */
type PrimaryButtonProps = {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
};

function PrimaryButton({ children, type = 'button', onClick }: PrimaryButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        background: primaryGradient,
        color: t.onPrimary,
        border: 'none',
        borderRadius: '0.375rem',
        padding: '1rem',
        fontFamily: font.headline,
        fontWeight: 700,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? t.shadow : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {children}
    </button>
  );
}

/** DESIGN.md §5 Secondary Button: ghost style, ghost border */
type GhostButtonProps = {
  children: React.ReactNode;
  icon?: React.ReactNode;
};

function GhostButton({ children, icon }: GhostButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.625rem',
        padding: '0.75rem',
        border: t.ghostBorder,
        borderRadius: '0.375rem',
        background: hovered ? t.surfaceContainerLow : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
        fontFamily: font.body,
        fontWeight: 600,
        fontSize: '0.875rem',
        color: t.onSurface,
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState('login');
  const [remember, setRemember] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [CFpassword, setCFpassword] = useState('');

  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('');

  const handleSubmit = (e: any) => {
    e.preventDefault();
    // TODO: connect auth logic
  };

  const handleRegister = () => {};

  const handleLogin = () => {};

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background: t.surface,
        fontFamily: font.body,
        color: t.onSurface,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* ── Left: Visual Narrative ──────────────────────────────────────────── */}
      <section
        style={{
          width: '50%',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          background: '#0d0d0d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Full-bleed cabin image */}
        <img
          alt="Luxurious First Class Airline Cabin"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHxC89jqQSKau0zWFiynLmFqr8xr_9CHxJ6k4sKfTUKGPFJdqjNhmym2Dyx_qNg908_Dj2KAUBKv6Dsl_yYl1cX3W2Q0iUFcrLhgBrSlX5Y2joPDR5m8-sWfgFmohwkKvnhjBYFM9vHDaLhl6YeUARXTFHZESi31KFePC59txu_Wre6MtNwammZJ7VDp4Uoy4b82DIUER-FkmEKP5uoYEhYYraPjwPmWbqKt7CpRhcTbtiOyZv4hanmsVUClTCjafTeRxW6GVzVxJA"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.75,
            transform: 'scale(1.04)',
          }}
        />
        {/* Destination Veil — bottom 30% gradient (DESIGN.md §5) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)',
          }}
        />

        {/* Copy block */}
        <div style={{ position: 'relative', zIndex: 10, padding: '4rem', maxWidth: '34rem' }}>
          <p
            style={{
              fontFamily: font.headline,
              fontWeight: 900,
              fontSize: '1.625rem',
              color: '#fff',
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              marginBottom: '2rem',
              textAlign: 'left',
            }}
          >
            The Sovereign
          </p>

          {/* Display headline — display-lg 3.5rem (DESIGN.md §3) */}
          <h2
            style={{
              fontFamily: font.headline,
              fontWeight: 700,
              fontSize: 'clamp(2.25rem, 3.5vw, 3.25rem)',
              color: '#fff',
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              marginBottom: '1.5rem',
              textAlign: 'left',
            }}
          >
            Hành trình bắt đầu
            <br />
            từ sự riêng tư
            <br />
            tuyệt đối.
          </h2>

          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '1rem',
              fontWeight: 300,
              lineHeight: 1.75,
              maxWidth: '26rem',
              textAlign: 'left',
            }}
          >
            Trải nghiệm dịch vụ hàng không đẳng cấp thế giới, nơi mỗi dặm bay là một chương mới của
            sự sang trọng và tiện nghi bậc nhất.
          </p>

          {/* Secondary gold accent — used sparingly (DESIGN.md §6 Do's) */}
          <div style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ height: '1px', width: '3rem', background: t.secondary }} />
            <span
              style={{
                fontFamily: font.body,
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: t.secondary,
              }}
            >
              Midnight Luxury
            </span>
          </div>
        </div>
      </section>

      {/* ── Right: Form ─────────────────────────────────────────────────────── */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          // DESIGN.md §2: surfaceContainerLowest = "lifted" card feel
          background: t.surfaceContainerLowest,
          backgroundImage: goldPattern,
          padding: '3rem 5rem',
          overflowY: 'auto',
        }}
      >
        {/* Decorative corner geometry (asymmetry per DESIGN.md §1) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '16rem',
            height: '16rem',
            overflow: 'hidden',
            pointerEvents: 'none',
            opacity: 0.035,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              border: `2px solid ${t.secondary}`,
              transform: 'rotate(45deg)',
              transformOrigin: 'center',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-40%',
              right: '-40%',
              width: '200%',
              height: '200%',
              border: `1px solid ${t.secondary}`,
              transform: 'rotate(40deg)',
              transformOrigin: 'center',
            }}
          />
        </div>

        <div style={{ width: '100%', maxWidth: '25rem', position: 'relative', zIndex: 10 }}>
          {/* Page heading */}
          <div style={{ marginBottom: '2rem' }}>
            <h1
              style={{
                fontFamily: font.headline,
                fontWeight: 700,
                fontSize: '1.875rem',
                color: t.onSurface,
                letterSpacing: '-0.02em',
                marginBottom: '0.5rem',
              }}
            >
              {tab === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
            </h1>
            <p style={{ color: t.onSurfaceVariant, fontWeight: 300, fontSize: '0.9375rem' }}>
              Chào mừng bạn trở lại với bầu trời của riêng mình.
            </p>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              borderBottom: t.ghostBorder,
              marginBottom: '2rem',
            }}
          >
            {[
              { key: 'login', label: 'Đăng Nhập' },
              { key: 'register', label: 'Đăng Ký' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  paddingBottom: '0.875rem',
                  fontFamily: font.body,
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: tab === key ? t.primary : t.onSurfaceVariant,
                  borderBottom: tab === key ? `2px solid ${t.primary}` : '2px solid transparent',
                  marginBottom: '-1px',
                  transition: 'color 0.2s, border-color 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <FieldLabel htmlFor="email">Địa chỉ Email</FieldLabel>
                  <BookingInput
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={setEmail}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', gap: '1.25rem' }}>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <FieldLabel htmlFor="firstName">First name</FieldLabel>
                    <BookingInput
                      id="firstName"
                      type="text"
                      placeholder="first name"
                      value={fname}
                      onChange={setFname}
                    />
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                    <BookingInput
                      id="lastName"
                      type="text"
                      placeholder="last name"
                      value={lname}
                      onChange={setLname}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <BookingInput
                    id="phone"
                    type="tel"
                    placeholder="phone number"
                    value={phone}
                    onChange={setPhone}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <FieldLabel htmlFor="nationality">Nationality</FieldLabel>
                  <Select
                    inputId="nationality"
                    options={countries}
                    placeholder="Chọn quốc gia"
                    isClearable
                    styles={sovereignStyles}
                    value={countries.find((c) => c.value === nationality) || null}
                    onChange={(option) => setNationality(option?.value || '')}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                  <BookingInput
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <FieldLabel htmlFor="confirmPassword">Xác nhận mật khẩu</FieldLabel>
                  <BookingInput
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={CFpassword}
                    onChange={setCFpassword}
                  />
                </div>

                <div style={{ marginTop: '0.8rem' }}>
                  <PrimaryButton type="submit" onClick={handleRegister}>
                    Đăng ký
                  </PrimaryButton>
                </div>
              </div>
            )}

            {tab === 'login' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <FieldLabel htmlFor="email">Địa chỉ Email</FieldLabel>
                  <BookingInput
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={setEmail}
                  />
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                    }}
                  >
                    <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                    {tab === 'login' && (
                      <button
                        type="button"
                        aria-label="Quên mật khẩu"
                        title="Quên mật khẩu"
                        onClick={() => {}}
                        style={{
                          fontSize: '0.6875rem',
                          fontFamily: font.body,
                          fontWeight: 700,
                          // Gold accent — DESIGN.md §6: secondary sparingly for accents
                          color: t.secondary,
                          textDecoration: 'none',
                          marginBottom: '0.3rem',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) =>
                          ((e.target as HTMLElement).style.textDecoration = 'underline')
                        }
                        onMouseLeave={(e) =>
                          ((e.target as HTMLElement).style.textDecoration = 'none')
                        }
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>
                  <BookingInput
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    style={{
                      width: '1rem',
                      height: '1rem',
                      accentColor: t.primary,
                      cursor: 'pointer',
                    }}
                  />
                  <label
                    htmlFor="remember"
                    style={{
                      fontSize: '0.875rem',
                      color: t.onSurfaceVariant,
                      fontFamily: font.body,
                      cursor: 'pointer',
                    }}
                  >
                    Duy trì đăng nhập trên thiết bị này
                  </label>
                </div>
                <div style={{ marginTop: '0.25rem' }}>
                  <PrimaryButton type="submit" onClick={handleLogin}>
                    Tiếp tục hành trình
                  </PrimaryButton>
                </div>
                <div style={{ position: 'relative', margin: '1.75rem 0', textAlign: 'center' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: 'rgba(230,189,184,0.18)',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <span
                    style={{
                      position: 'relative',
                      background: t.surfaceContainerLowest,
                      padding: '0 1rem',
                      fontSize: '0.6875rem',
                      fontFamily: font.body,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: `${t.onSurfaceVariant}99`,
                    }}
                  >
                    Hoặc tiếp tục với
                  </span>
                </div>
                {/* Social — ghost secondary style (DESIGN.md §5) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <GhostButton
                    icon={
                      <img
                        alt="Google"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUn0nbvARamZwA1rj5iE0shrex_jevt3q5Bb11xT-HZ06xQOxI0Jsk-B3c6wPDU7uVbd1I2haU3lF3D6095w1GIwLnWo0dlMqQOMui51AlxflouXX3wEwEwzDU_ywvdUwnRPz0lWbiyHXSxluExVrPMbiehgi5XPWd-GHp3dx2ItCeOJRjRByXKIhNM1-lBhIgpBbYSfbmSvK0DFjeJdhL8BauGjqFljDS_j9pOOt70YGPPQy3jMt4aRdvKFauRjlKparmf67JFt9E"
                        style={{ width: '1.25rem', height: '1.25rem' }}
                      />
                    }
                  >
                    Google
                  </GhostButton>
                  <GhostButton
                    icon={
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '1.25rem', color: t.onSurface }}
                      >
                        ios
                      </span>
                    }
                  >
                    Apple
                  </GhostButton>
                </div>
              </div>
            )}
          </form>

          {/* Legal footer */}
          <p
            style={{
              marginTop: '2.5rem',
              textAlign: 'center',
              fontSize: '0.6875rem',
              fontFamily: font.body,
              color: `${t.onSurfaceVariant}80`,
              lineHeight: 1.75,
            }}
          >
            Bằng việc tiếp tục, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của The
            Sovereign.
          </p>
        </div>
      </section>
    </main>
  );
}
