"use client";
import { useEffect, useRef, useState } from "react";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useI18n } from "@/components/providers/I18nProvider";

export default function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Software Name';

  // Left panel animation: fade video in/out every 10s
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const playCycle = () => {
      setShowVideo(true);
      const v = videoRef.current;
      const vm = mobileVideoRef.current;
      try { if (v) { v.playbackRate = 1.0; v.currentTime = 0; v.play().catch(()=>{}); } } catch {}
      try { if (vm) { vm.playbackRate = 1.0; vm.currentTime = 0; vm.play().catch(()=>{}); } } catch {}
      setTimeout(() => {
        setShowVideo(false);
        try { if (v) { v.pause(); } } catch {}
        try { if (vm) { vm.pause(); } } catch {}
      }, 4000);
    };
    const start = setTimeout(playCycle, 2000);
    const id = setInterval(playCycle, 10000);
    return () => { clearTimeout(start); clearInterval(id); };
  }, []);

  // Prefill remembered email
  useEffect(() => {
    try {
      const saved = localStorage.getItem('axio.remember.email');
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sign in failed');
      if (remember) {
        try { localStorage.setItem('axio.remember.email', email); } catch {}
      } else {
        try { localStorage.removeItem('axio.remember.email'); } catch {}
      }
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#eef2f6] text-[#0f172a]">
      <div className="mx-auto grid grid-cols-1 md:grid-cols-2 min-h-screen">
        {/* Left image/video with fade cycle */}
        <div className="hidden md:block relative overflow-hidden">
          <img src="/group_photo_AI.png" alt="welcome" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700" style={{opacity: showVideo ? 0 : 1}} />
          <video
            ref={videoRef}
            src="/avatar_mov.mp4"
            muted
            playsInline
            loop
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{opacity: showVideo ? 1 : 0}}
          />
        </div>

        {/* Right panel */}
        <div className="flex flex-col justify-center px-6 md:px-12 py-10 bg-[#f3f6fb] border-l border-[#e5eaf1] relative">
          {/* Mobile image/video on top */}
          <div className="md:hidden relative overflow-hidden -mt-4 mb-6 rounded-xl border border-[#e5eaf1]">
            <img src="/group_photo_AI.png" alt="welcome" className="w-full h-40 object-cover transition-opacity duration-700" style={{opacity: showVideo ? 0 : 1}} />
            <video
              ref={mobileVideoRef}
              src="/avatar_mov.mp4"
              muted
              playsInline
              loop
              className="absolute inset-0 w-full h-40 object-cover transition-opacity duration-700"
              style={{opacity: showVideo ? 1 : 0}}
            />
          </div>
          {/* Language selector */}
          <div className="absolute top-6 right-6">
            <div className="flex items-center gap-2 px-2 py-2 rounded-md border border-[#cfd8e3] bg-white text-sm">
              <button className={`px-2 py-1 rounded ${locale==='en'?'bg-[#eef2f6]':''}`} onClick={()=>setLocale('en')} aria-label="English">EN</button>
              <button className={`px-2 py-1 rounded ${locale==='th'?'bg-[#eef2f6]':''}`} onClick={()=>setLocale('th')} aria-label="Thai">TH</button>
            </div>
          </div>

          {/* Logo */}
          <div className="mx-auto w-24 h-24 rounded-2xl bg-white shadow-md border border-[#e5eaf1] flex items-center justify-center mb-6 overflow-hidden">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path opacity="0.65" d="M14.1283 7.95592C15.0454 6.72855 14.8006 4.9966 13.5814 4.08749C12.3622 3.17838 10.6304 3.43639 9.71323 4.66376L4.04636 12.2473C3.1292 13.4747 3.37403 15.2066 4.59322 16.1157C5.8124 17.0248 7.54425 16.7668 8.46142 15.5395L14.1283 7.95592Z" fill="black"/>
              <path d="M15.4406 15.5192C16.3578 16.7465 18.0896 17.0045 19.3088 16.0954C20.528 15.1863 20.7729 13.4544 19.8557 12.227L14.1888 4.64345C13.2717 3.41608 11.5398 3.15808 10.3206 4.06719C9.10144 4.9763 8.85661 6.70825 9.77377 7.93562L15.4406 15.5192Z" fill="black"/>
              <path d="M6.31415 20.5358L4.81527 18.2717C4.76883 18.2016 4.70904 18.1415 4.63935 18.0949C4.56966 18.0482 4.49148 18.016 4.40932 18H4.39183H4.35061H4.32188H4.25693H4.22945H4.18699H4.1695C4.08734 18.016 4.00916 18.0482 3.93947 18.0949C3.86978 18.1415 3.80999 18.2016 3.76355 18.2717L2.26467 20.5358C2.21849 20.6052 2.18635 20.6831 2.17009 20.7651C2.15383 20.8471 2.15375 20.9315 2.16987 21.0135C2.186 21.0955 2.218 21.1734 2.26405 21.243C2.31011 21.3125 2.36931 21.3722 2.43829 21.4187C2.50726 21.4652 2.58465 21.4976 2.66605 21.514C2.74744 21.5304 2.83125 21.5304 2.91267 21.5142C2.99409 21.498 3.07154 21.4657 3.1406 21.4194C3.20965 21.373 3.26896 21.3134 3.31513 21.2439L4.29066 19.7748L5.26618 21.2439C5.35961 21.3832 5.50389 21.4797 5.66763 21.5125C5.83137 21.5452 6.00133 21.5115 6.14053 21.4187C6.20951 21.3722 6.26872 21.3125 6.31477 21.243C6.36083 21.1734 6.39284 21.0955 6.40896 21.0135C6.42508 20.9315 6.42501 20.8471 6.40874 20.7651C6.39247 20.6831 6.36033 20.6052 6.31415 20.5358Z" fill="black"/>
              <path d="M10.2967 21.1886C10.2855 21.1673 9.77933 20.4361 9.26569 19.6936C9.74344 19.0037 10.1878 18.3616 10.1989 18.3415C10.2224 18.2988 10.2695 18.0568 10.0392 18.0568H9.30777C9.27287 18.0548 9.23807 18.0621 9.2068 18.0779C9.17554 18.0937 9.14891 18.1176 9.12955 18.1471C9.12955 18.1471 8.93275 18.4293 8.6617 18.8219L8.19262 18.1471C8.17339 18.1163 8.14636 18.0914 8.11435 18.0748C8.08234 18.0583 8.04654 18.0507 8.01068 18.053H7.2792C7.05023 18.053 7.09726 18.2951 7.12078 18.3377C7.13068 18.3578 7.57501 19 8.05276 19.6898C7.54407 20.4361 7.03662 21.1623 7.02053 21.1886C6.99701 21.2313 6.94998 21.4733 7.18019 21.4733H7.91166C7.94654 21.4752 7.9813 21.4679 8.01255 21.452C8.04379 21.4362 8.07044 21.4124 8.08989 21.383L8.65675 20.5653L9.22361 21.383C9.24297 21.4125 9.2696 21.4364 9.30087 21.4522C9.33213 21.4681 9.36694 21.4753 9.40183 21.4733H10.1333C10.3623 21.4683 10.3202 21.2263 10.2967 21.1886Z" fill="black"/>
              <path d="M12.6285 17.9474C11.5932 17.9474 10.8948 18.679 10.8948 19.7676C10.8948 20.8562 11.5747 21.579 12.6285 21.579C13.6824 21.579 14.3685 20.8511 14.3685 19.7676C14.3685 18.6626 13.6861 17.9474 12.6285 17.9474ZM13.3183 19.7676C13.3183 20.72 12.7994 20.7199 12.6285 20.7199C12.4576 20.7199 11.9486 20.72 11.9486 19.7676C11.9486 19.1205 12.1703 18.8064 12.6285 18.8064C13.0867 18.8064 13.3183 19.1205 13.3183 19.7676Z" fill="black"/>
              <path d="M16.5387 18H16.5177C15.6557 18 14.9476 18.5343 14.9476 19.4826V21.408C14.9466 21.4232 14.9487 21.4385 14.9538 21.4529C14.9588 21.4672 14.9668 21.4804 14.9771 21.4914C14.9874 21.5025 14.9998 21.5113 15.0136 21.5172C15.0274 21.5232 15.0423 21.5261 15.0572 21.5259H15.8577C15.8746 21.5271 15.8915 21.5248 15.9074 21.519C15.9234 21.5132 15.938 21.5042 15.9504 21.4924C15.9627 21.4807 15.9726 21.4664 15.9793 21.4506C15.986 21.4348 15.9895 21.4177 15.9894 21.4005V19.6444C15.9894 19.011 16.3515 18.9219 16.5263 18.9219C16.7012 18.9219 17.0632 19.011 17.0632 19.6444V21.4005C17.0632 21.4178 17.0667 21.435 17.0735 21.4509C17.0803 21.4668 17.0902 21.4811 17.1027 21.4929C17.1152 21.5047 17.13 21.5137 17.1461 21.5194C17.1622 21.5251 17.1793 21.5273 17.1962 21.5259H17.9954C18.0104 21.5261 18.0253 21.5232 18.0391 21.5172C18.0529 21.5113 18.0653 21.5025 18.0756 21.4914C18.0859 21.4804 18.0938 21.4672 18.0989 21.4529C18.104 21.4385 18.1061 21.4232 18.105 21.408V19.4814C18.1087 18.5343 17.397 18 16.5387 18Z" fill="black"/>
              <path d="M18.6888 20.4659C18.6888 20.4659 18.6512 20.307 18.7916 20.307H19.5436C19.5697 20.3043 19.5959 20.3111 19.6175 20.3261C19.6391 20.3412 19.6547 20.3635 19.6614 20.389C19.7078 20.6046 19.877 20.7572 20.2455 20.7673C20.614 20.7774 20.7744 20.6879 20.7744 20.4798C20.7744 20.4268 20.7556 20.3474 20.5964 20.2679C20.3971 20.1907 20.1899 20.1361 19.9785 20.1052C19.1625 19.9526 18.7489 19.6008 18.7489 19.0724C18.7437 18.8993 18.7852 18.728 18.8691 18.5767C18.953 18.4255 19.076 18.3 19.2252 18.2136C19.2252 18.2136 19.5674 17.9538 20.2655 17.9475C21.0426 17.9399 21.6254 18.3826 21.7119 18.8656C21.7149 18.881 21.7144 18.8968 21.7105 18.912C21.7067 18.9272 21.6995 18.9413 21.6896 18.9534C21.6796 18.9655 21.6671 18.9752 21.653 18.9818C21.6389 18.9884 21.6235 18.9918 21.6079 18.9917H20.7857C20.7641 18.9919 20.7428 18.9872 20.7233 18.9781C20.7038 18.9689 20.6865 18.9555 20.6729 18.9387L20.6603 18.9236C20.6026 18.8649 20.533 18.8194 20.4562 18.7902C20.3794 18.761 20.2973 18.7489 20.2154 18.7546C19.8206 18.7546 19.8206 18.9135 19.8206 18.9665C19.8206 19.0194 19.8469 19.1191 20.0712 19.2023C20.2925 19.2705 20.5183 19.3232 20.7468 19.3599C21.4738 19.5012 21.841 19.8366 21.841 20.3549C21.8496 20.5455 21.8077 20.7348 21.7196 20.9037C21.6315 21.0726 21.5004 21.2148 21.3397 21.3159C21.0175 21.4977 20.6523 21.588 20.2831 21.577C19.9014 21.5942 19.5231 21.4996 19.1939 21.3046C19.0521 21.2121 18.9332 21.0882 18.8463 20.9424C18.7594 20.7966 18.7068 20.6328 18.6925 20.4634C18.6925 20.4634 18.6925 20.452 18.6925 20.4457" fill="black"/>
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-center">{appName}</h1>
          <p className="mt-2 text-center text-[#5b6575] max-w-md mx-auto">
            {t('signUpLead', { app: appName })}
          </p>

          {/* Tabs: Sign in / Sign up */}
          <div className="sr-only">
            <button onClick={() => setTab('signin')}>Sign in</button>
            <button onClick={() => setTab('signup')}>Sign up</button>
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSubmit} className="mt-8 mx-auto w-full max-w-md bg-white border border-[#e5eaf1] rounded-lg p-6">
              <div className="mb-2 text-sm font-semibold">{t('welcomeBack')}</div>
              <div className="mb-6 text-xs text-[#6b7280]">{t('signInToContinue', { app: appName })}</div>

              {error && (
                <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
              )}

              <label className="text-sm font-medium" htmlFor="email">{t('email')}</label>
              <div className="mt-1 mb-4 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.87508 3.33301C3.38677 3.33301 2.16675 4.55303 2.16675 6.04134V13.958C2.16675 15.4463 3.38677 16.6663 4.87508 16.6663H16.1251C17.6134 16.6663 18.8334 15.4463 18.8334 13.958V6.04134C18.8334 4.55303 17.6134 3.33301 16.1251 3.33301H4.87508ZM4.87508 4.58301H16.1251C16.9376 4.58301 17.5834 5.22882 17.5834 6.04134V6.50195L10.5001 10.3309L3.41675 6.50195V6.04134C3.41675 5.22882 4.06256 4.58301 4.87508 4.58301ZM3.41675 7.92285L10.203 11.5915C10.2943 11.6408 10.3964 11.6666 10.5001 11.6666C10.6038 11.6666 10.7059 11.6408 10.7971 11.5915L17.5834 7.92285V13.958C17.5834 14.7705 16.9376 15.4163 16.1251 15.4163H4.87508C4.06256 15.4163 3.41675 14.7705 3.41675 13.958V7.92285Z" fill="#344054"/>
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  className="w-full h-10 rounded-md border border-[#cfd8e3] pl-10 pr-3 bg-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <label className="text-sm font-medium" htmlFor="password">{t('password')}</label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  className="w-full h-10 rounded-md border border-[#cfd8e3] px-3 bg-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 select-none">
                  <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
                  Remember
                </label>
                <button
                  type="button"
                  className="text-[#2563eb] hover:underline"
                  onClick={async () => {
                    const target = email || prompt('Enter your account email');
                    if (!target) return;
                    try {
                      await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: target }) });
                      alert('If an account exists, a reset link was sent.');
                    } catch {
                      alert('Unable to send reset link right now.');
                    }
                  }}
                >
                  {t('forgotPassword')}
                </button>
              </div>

              <button type="submit" disabled={loading} className="mt-6 w-full h-10 rounded-md bg-[#0b5cd6] text-white font-semibold hover:bg-[#0a56c8]">
                {loading ? '…' : t('login')}
              </button>

              <div className="mt-4 text-center text-sm">
                {t('noAccount')}{' '}
                <button type="button" onClick={() => setTab('signup')} className="text-[#16a34a] hover:underline">{t('signUp')}</button>
              </div>
            </form>
          ) : (
            <div className="mt-8 mx-auto w-full max-w-md bg-white border border-[#e5eaf1] rounded-lg p-6">
              <SignUpForm
                variant="plain"
                onSwitchToSignIn={() => setTab('signin')}
                onSuccess={() => setTab('signin')}
              />
            </div>
          )}

          {/* Footer pinned bottom */}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-between text-xs text-[#6b7280] max-w-md mx-auto w-full px-6 md:px-0">
            <span>Version 1.00</span>
            <span>©2025 AXONS. All Rights Reserved.</span>
          </div>
        </div>
      </div>
    </div>
  );
}


