const { useEffect, useMemo, useRef, useState } = React;
const {
  ArrowLeft,
  Bell,
  Bot,
  FileText,
  Heart,
  Home,
  LayoutGrid,
  LogIn,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  StickyNote,
  Terminal,
  Trash2,
  User,
} = lucideReact;

const STORAGE_KEYS = {
  login: "melpin_isLoggedIn",
  profile: "melpin_userProfile",
  notes: "melpin_notes",
  reminders: "melpin_reminders",
};

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY", // TODO: ganti dengan API key Firebase asli kamu.
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // TODO: ganti dengan API key Gemini asli kamu.

const SECRET_USERNAME = "cinta";

const readStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Ignore storage errors (private mode / quota / etc).
  }
};

const getGreeting = (now) => {
  const hour = now.getHours();
  if (hour >= 5 && hour <= 11) {
    return "Selamat Pagi cantik, semangat ya hari ini! ☀️";
  }
  if (hour >= 12 && hour <= 14) {
    return "Siang cantik, jangan lupa makan loh! 🍱";
  }
  if (hour >= 15 && hour <= 17) {
    return "Soreee, capek ya? Istirahat bentar yuk 🌅";
  }
  return "Udah malem nih, istirahat gih, mimpi indah ya 🌙";
};

const calculateAgeParts = (birthDate, now) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += daysInPrevMonth;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  if (years < 0) return null;
  return { years, months, days };
};

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getNodeAtPath = (fileSystem, pathSegments) => {
  let node = fileSystem;
  for (const segment of pathSegments) {
    if (!node || typeof node !== "object" || !(segment in node)) {
      return null;
    }
    node = node[segment];
  }
  return node;
};

const addFolderAtPath = (fileSystem, pathSegments, folderName) => {
  const clone = { ...fileSystem };
  let cursor = clone;
  for (const segment of pathSegments) {
    cursor[segment] = { ...cursor[segment] };
    cursor = cursor[segment];
  }
  if (!cursor[folderName]) {
    cursor[folderName] = {};
  }
  return clone;
};

const buildSystemPrompt = (profileName) => {
  const safeName = profileName || "kamu";
  return `Kamu adalah Melfin. Kamu adalah laki-laki dan sedang ngobrol dengan orang yang kamu sayang (seorang perempuan bernama ${safeName}). Kamu sedang berada dalam hubungan tanpa status. DILARANG KERAS menggunakan bahasa baku. Gunakan bahasa santai, campur bahasa gaul (gua, lu), dan dialek Jawa Timuran Suroboyoan (seperti: iki, gasido, gaisok, udan, jek tas, wes, wkwkwk). Gaya bicaramu lucu, perhatian, kadang suka ngeledek bercanda, dan sangat antusias (misal merespons dengan 'wihh kerenn').`;
};

const NavPill = ({ icon: Icon, label, active }) => (
  <div
    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
      active
        ? "bg-hot text-black shadow-[0_0_15px_rgba(255,20,147,0.6)]"
        : "bg-ink-3/60 text-soft/80 hover:bg-ink-3 hover:text-soft"
    }`}
  >
    <Icon size={16} />
    {label}
  </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="flex flex-wrap items-center gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hot/20 text-hot">
      <Icon size={22} />
    </div>
    <div>
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <p className="text-sm text-slate">{subtitle}</p>
    </div>
  </div>
);

const ChatBubble = ({ align, tone, text }) => (
  <div className={`flex ${align}`}>
    <div
      className={`max-w-[78%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-[0_0_18px_rgba(0,0,0,0.25)] ${tone}`}
    >
      {text}
    </div>
  </div>
);

function App() {
  const initialProfile = readStorage(STORAGE_KEYS.profile, null);
  const initialLoggedIn = readStorage(STORAGE_KEYS.login, false);
  const initialView = initialLoggedIn ? (initialProfile ? "dashboard" : "setup") : "login";

  const [currentView, setCurrentView] = useState(initialView);
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);
  const [profile, setProfile] = useState(initialProfile);

  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [setupName, setSetupName] = useState("");
  const [setupBirth, setSetupBirth] = useState("");

  const [now, setNow] = useState(() => new Date());

  const [notes, setNotes] = useState(() => readStorage(STORAGE_KEYS.notes, []));
  const [reminders, setReminders] = useState(() => readStorage(STORAGE_KEYS.reminders, []));

  const [fileSystem, setFileSystem] = useState(() => ({ home: { cinta: {} } }));
  const [terminalHistory, setTerminalHistory] = useState(() => [
    { type: "output", text: "Selamat datang di Terminal Linux lucu. Coba ketik 'ls' dulu." },
  ]);
  const [currentPath, setCurrentPath] = useState(["home", "cinta"]);
  const [terminalInput, setTerminalInput] = useState("");
  const terminalRef = useRef(null);

  const [chatMode, setChatMode] = useState("realtime");
  const [realtimeInput, setRealtimeInput] = useState("");
  const [realtimeMessages, setRealtimeMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    // Keep time-based greeting and age updated without doing Date() inside render.
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.login, isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    if (profile) writeStorage(STORAGE_KEYS.profile, profile);
  }, [profile]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.notes, notes);
  }, [notes]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.reminders, reminders);
  }, [reminders]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalHistory]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMode, realtimeMessages, aiMessages, aiLoading]);

  const greeting = useMemo(() => getGreeting(now), [now]);
  const ageParts = useMemo(() => calculateAgeParts(profile?.birthDate, now), [profile, now]);
  const pendingReminderCount = reminders.filter((reminder) => !reminder.done).length;

  // Validate secret login and route to setup or dashboard.
  const handleLoginSubmit = (event) => {
    event.preventDefault();
    const normalized = loginInput.trim().toLowerCase();
    if (!normalized) {
      setLoginError("Isi dulu ya, jangan kosong.");
      return;
    }
    if (normalized !== SECRET_USERNAME) {
      setLoginError("Ih salah! Kamu siapa hayo?");
      return;
    }
    setLoginError("");
    setIsLoggedIn(true);
    setCurrentView(profile ? "dashboard" : "setup");
  };

  const handleSetupSubmit = (event) => {
    event.preventDefault();
    if (!setupName.trim() || !setupBirth) return;
    setProfile({ name: setupName.trim(), birthDate: setupBirth });
    setCurrentView("dashboard");
  };

  // Parse terminal commands and update VFS, path, and history.
  const handleTerminalSubmit = (event) => {
    event.preventDefault();
    const trimmed = terminalInput.trim();
    if (!trimmed) return;

    const [command, ...args] = trimmed.split(" ");
    const entry = { type: "input", text: `$ ${trimmed}` };

    if (command === "clear") {
      setTerminalHistory([]);
      setTerminalInput("");
      return;
    }

    let outputEntry = null;

    if (command === "pwd") {
      const path = currentPath.length ? `/${currentPath.join("/")}` : "/";
      outputEntry = { type: "output", text: path };
    } else if (command === "ls") {
      const node = getNodeAtPath(fileSystem, currentPath) ?? {};
      const keys = Object.keys(node);
      outputEntry = { type: "output", text: keys.length ? keys.join("  ") : "(kosong)" };
    } else if (command === "mkdir") {
      const name = args[0];
      if (!name) {
        outputEntry = { type: "error", text: "Kasih nama foldernya dong." };
      } else {
        const node = getNodeAtPath(fileSystem, currentPath);
        if (!node) {
          outputEntry = { type: "error", text: "Path-nya gak ketemu." };
        } else if (node[name]) {
          outputEntry = { type: "error", text: "Folder itu udah ada." };
        } else {
          setFileSystem((prev) => addFolderAtPath(prev, currentPath, name));
          outputEntry = { type: "output", text: `Folder '${name}' dibuat.` };
        }
      }
    } else if (command === "cd") {
      const target = args[0];
      if (!target) {
        outputEntry = { type: "error", text: "Mau cd ke mana nih?" };
      } else if (target === "..") {
        setCurrentPath((prev) => (prev.length ? prev.slice(0, -1) : prev));
      } else if (target === "/") {
        setCurrentPath([]);
      } else {
        const nextPath = [...currentPath, target];
        const node = getNodeAtPath(fileSystem, nextPath);
        if (!node || typeof node !== "object") {
          outputEntry = { type: "error", text: "Folder-nya gak ada." };
        } else {
          setCurrentPath(nextPath);
        }
      }
    } else if (command === "echo") {
      outputEntry = { type: "output", text: args.join(" ") };
    } else {
      outputEntry = { type: "error", text: "Hayo typo tuh! Coba ketik pelan-pelan~" };
    }

    setTerminalHistory((prev) => {
      const next = [...prev, entry];
      if (outputEntry) next.push(outputEntry);
      return next;
    });
    setTerminalInput("");
  };

  const handleRealtimeSend = (event) => {
    event.preventDefault();
    const trimmed = realtimeInput.trim();
    if (!trimmed) return;
    setRealtimeMessages((prev) => [...prev, { id: makeId(), from: "me", text: trimmed }]);
    setRealtimeInput("");
  };

  // Call Gemini API with system prompt and rolling chat history.
  const sendMessageToAI = async (text) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith("YOUR_")) {
      return "API key Gemini belum diisi. Isi dulu ya.";
    }

    const history = aiMessages.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    }));

    const body = {
      systemInstruction: {
        role: "system",
        parts: [{ text: buildSystemPrompt(profile?.name) }],
      },
      contents: [...history, { role: "user", parts: [{ text }] }],
    };

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await response.json();
      const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return candidate || "Hmm... aku bingung jawabnya.";
    } catch (error) {
      return "Koneksi ke AI gagal. Coba lagi ya.";
    }
  };

  // Orchestrate AI chat flow with loading indicator.
  const handleAiSend = async (event) => {
    event.preventDefault();
    const trimmed = aiInput.trim();
    if (!trimmed || aiLoading) return;

    const userMessage = { id: makeId(), role: "user", text: trimmed };
    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput("");
    setAiLoading(true);

    const aiText = await sendMessageToAI(trimmed);
    setAiMessages((prev) => [...prev, { id: makeId(), role: "assistant", text: aiText }]);
    setAiLoading(false);
  };

  const handleAddNote = () => {
    setNotes((prev) => [...prev, { id: makeId(), text: "Tulis catatan manis di sini..." }]);
  };

  const handleUpdateNote = (id, text) => {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, text } : note)));
  };

  const handleDeleteNote = (id) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const handleAddReminder = (event) => {
    event.preventDefault();
    const text = event.target.elements.reminder?.value.trim();
    if (!text) return;
    setReminders((prev) => [...prev, { id: makeId(), text, done: false }]);
    event.target.reset();
  };

  const handleToggleReminder = (id) => {
    setReminders((prev) =>
      prev.map((reminder) => (reminder.id === id ? { ...reminder, done: !reminder.done } : reminder))
    );
  };

  const handleDeleteReminder = (id) => {
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
  };

  const navItems = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "terminal", label: "Terminal", icon: Terminal },
    { id: "chat-hub", label: "Chat", icon: MessageCircle },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "reminders", label: "Reminder", icon: Bell },
  ];

  const showNav = isLoggedIn && currentView !== "login" && currentView !== "setup";

  return (
    <div className="min-h-screen pb-28">
      {currentView === "login" && (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="glass animate-reveal w-full max-w-md rounded-[32px] p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-hot/20 text-hot">
                <Heart size={26} />
              </div>
              <div>
                <h1 className="font-display text-2xl text-white">The Gate</h1>
                <p className="text-sm text-slate">Masuk dulu, terus kita main bareng.</p>
              </div>
            </div>
            <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
              <input
                type="text"
                value={loginInput}
                onChange={(event) => setLoginInput(event.target.value)}
                placeholder="Username rahasia"
                className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
              />
              {loginError && <p className="text-sm text-hot">{loginError}</p>}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-hot px-4 py-3 font-semibold text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,20,147,0.6)]"
              >
                <LogIn size={18} />
                Masuk
              </button>
            </form>
            <p className="mt-6 text-xs text-slate">Hint: username rahasianya cuma satu kata.</p>
          </div>
        </div>
      )}

      {currentView === "setup" && (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="glass animate-reveal w-full max-w-lg rounded-[32px] p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-hot/20 text-hot">
                <User size={24} />
              </div>
              <div>
                <h1 className="font-display text-2xl text-white">Setup Profil</h1>
                <p className="text-sm text-slate">Biar aku makin kenal kamu.</p>
              </div>
            </div>
            <form onSubmit={handleSetupSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Nama Panggilan</label>
                <input
                  type="text"
                  value={setupName}
                  onChange={(event) => setSetupName(event.target.value)}
                  placeholder="Misal: Nona Pink"
                  className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Tanggal Lahir</label>
                <input
                  type="date"
                  value={setupBirth}
                  onChange={(event) => setSetupBirth(event.target.value)}
                  className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white focus:border-hot focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-hot px-4 py-3 font-semibold text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,20,147,0.6)]"
              >
                <Sparkles size={18} />
                Simpan Profil
              </button>
            </form>
          </div>
        </div>
      )}

      {showNav && (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate">Melpin Interactive Space</p>
              <h1 className="font-display text-3xl text-white">Dark Cute Home Base</h1>
            </div>
            <div className="flex items-center gap-3 rounded-3xl border border-hot/30 bg-ink-3/60 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hot/20 text-hot">
                <Heart size={20} />
              </div>
              <div>
                <p className="text-xs text-slate">Punya kamu</p>
                <p className="text-sm font-semibold text-white">{profile?.name || "Sayang"}</p>
              </div>
            </div>
          </header>

          {currentView === "dashboard" && (
            <div className="space-y-6">
              <div className="glass rounded-[32px] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate">Pesan buat kamu</p>
                    <h2 className="mt-1 font-display text-2xl text-white">{greeting}</h2>
                    {ageParts && (
                      <p className="mt-3 text-sm text-soft">
                        Umur kamu sekarang: {ageParts.years} tahun, {ageParts.months} bulan, {ageParts.days} hari.
                      </p>
                    )}
                  </div>
                  <div className="hidden items-center gap-2 rounded-full border border-hot/30 bg-ink-3/70 px-4 py-2 text-xs text-slate md:flex">
                    <Sparkles size={14} />
                    {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-hot/20 bg-ink-3/50">
                <div className="flex gap-12 whitespace-nowrap px-6 py-3 text-xs text-soft/80">
                  <div className="animate-marquee flex items-center gap-10">
                    <span>Terminal lucu udah siap.</span>
                    <span>Chat hub lagi nunggu cerita kamu.</span>
                    <span>Reminder biar kamu gak lupa makan.</span>
                    <span>Notes buat curhat manja kapan aja.</span>
                    <span>Terminal lucu udah siap.</span>
                    <span>Chat hub lagi nunggu cerita kamu.</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    id: "terminal",
                    label: "Terminal Linux",
                    desc: "Latihan perintah dasar sambil ketawa.",
                    icon: Terminal,
                  },
                  {
                    id: "chat-hub",
                    label: "Chat Hub",
                    desc: "Melfin asli atau AI, pilih mood kamu.",
                    icon: MessageCircle,
                  },
                  { id: "notes", label: "Notes", desc: "Sticky notes pink neon buat curhat.", icon: StickyNote },
                  {
                    id: "reminders",
                    label: "Reminders",
                    desc: "Todo list biar gak kelewatan.",
                    icon: Bell,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className="glass group flex items-center justify-between rounded-[28px] p-5 text-left transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate">{item.label}</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{item.desc}</h3>
                    </div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-hot/20 text-hot">
                      <item.icon size={22} />
                      {item.id === "reminders" && pendingReminderCount > 0 && (
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentView === "terminal" && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
              <div className="glass rounded-[32px] p-6">
                <SectionTitle
                  icon={Terminal}
                  title="Interactive Terminal"
                  subtitle="Belajar Linux dasar sambil praktek langsung."
                />
                <div className="mt-6 space-y-4 text-sm text-slate">
                  <p>
                    Kamu sekarang di terminal virtual. Coba perintah dasar: <span className="text-soft">ls</span>,
                    <span className="text-soft"> cd</span>, <span className="text-soft">mkdir</span>,
                    <span className="text-soft"> pwd</span>, <span className="text-soft">echo</span>.
                  </p>
                  <div className="rounded-2xl border border-hot/20 bg-ink-3/70 p-4 text-xs text-soft">
                    <p className="font-semibold text-white">Tips lucu:</p>
                    <ul className="mt-2 space-y-1">
                      <li>- Coba bikin folder: mkdir manis</li>
                      <li>- Masuk folder: cd manis</li>
                      <li>- Balik ke atas: cd ..</li>
                      <li>- Bersihin layar: clear</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="glass rounded-[32px] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-2 text-green-400">
                      <Terminal size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-slate">Terminal Session</p>
                      <p className="text-sm text-white">cinta@melpin</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-hot/30 bg-ink-3/70 px-3 py-1 text-xs text-soft">
                    {currentPath.length ? `/${currentPath.join("/")}` : "/"}
                  </span>
                </div>

                <div
                  ref={terminalRef}
                  className="mt-4 h-80 space-y-2 overflow-y-auto rounded-2xl border border-hot/20 bg-black/70 p-4 font-mono text-xs text-soft scrollbar-hide"
                >
                  {terminalHistory.map((item, index) => (
                    <div
                      key={`${item.type}-${index}`}
                      className={
                        item.type === "input"
                          ? "text-green-400"
                          : item.type === "error"
                          ? "text-amber-400"
                          : "text-soft"
                      }
                    >
                      {item.text}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleTerminalSubmit} className="mt-4 flex items-center gap-2">
                  <span className="font-mono text-xs text-green-400">
                    {currentPath.length ? `cinta@melpin:/${currentPath.join("/")}$` : "cinta@melpin:/$"}
                  </span>
                  <input
                    value={terminalInput}
                    onChange={(event) => setTerminalInput(event.target.value)}
                    placeholder="ketik command di sini"
                    className="flex-1 bg-transparent font-mono text-xs text-green-300 outline-none placeholder:text-green-500/60"
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-hot/40 px-3 py-1 text-xs text-hot transition-all duration-300 hover:scale-105 hover:shadow-[0_0_12px_rgba(255,20,147,0.6)]"
                  >
                    Enter
                  </button>
                </form>
              </div>
            </div>
          )}

          {currentView === "chat-hub" && (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
              <div className="glass rounded-[32px] p-6">
                <SectionTitle icon={MessageCircle} title="Chat Hub" subtitle="Switch antara Melfin asli dan AI." />
                <div className="mt-6 space-y-4 text-sm text-slate">
                  <p>
                    Mode <span className="text-soft">Real-Time</span> nanti akan nyambung ke Firebase.
                    Sekarang aku siapin layout dan feel-nya dulu.
                  </p>
                  <p>
                    Mode <span className="text-soft">AI Companion</span> bakal pakai Gemini API. Chat history tetap
                    dijaga biar nyambung.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => setChatMode("realtime")}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-300 ${
                      chatMode === "realtime"
                        ? "bg-hot text-black"
                        : "border border-hot/30 text-soft hover:bg-ink-3"
                    }`}
                  >
                    <MessageCircle size={16} />
                    Real-Time
                  </button>
                  <button
                    onClick={() => setChatMode("ai")}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-300 ${
                      chatMode === "ai" ? "bg-hot text-black" : "border border-hot/30 text-soft hover:bg-ink-3"
                    }`}
                  >
                    <Bot size={16} />
                    AI Companion
                  </button>
                </div>
              </div>

              <div className="glass flex h-full flex-col rounded-[32px] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate">{chatMode === "realtime" ? "Melfin Asli" : "Melpin AI"}</p>
                    <p className="text-lg font-semibold text-white">
                      {chatMode === "realtime" ? "Real-Time Chat" : "Virtual Companion"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      chatMode === "realtime"
                        ? "border border-hot/30 bg-ink-3/70 text-soft"
                        : "border border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    }`}
                  >
                    {chatMode === "realtime" ? "Offline dulu" : aiLoading ? "Melpin AI is typing..." : "Siap ngobrol"}
                  </span>
                </div>

                <div
                  ref={chatRef}
                  className="mt-5 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-hot/20 bg-black/60 p-4 text-sm scrollbar-hide"
                >
                  {chatMode === "realtime" && realtimeMessages.length === 0 && (
                    <p className="text-center text-xs text-slate">Belum ada chat. Ketik dulu ya.</p>
                  )}
                  {chatMode === "realtime" &&
                    realtimeMessages.map((message) => (
                      <ChatBubble
                        key={message.id}
                        align={message.from === "me" ? "justify-end" : "justify-start"}
                        tone={
                          message.from === "me"
                            ? "bg-hot/90 text-black"
                            : "bg-ink-3/80 text-soft"
                        }
                        text={message.text}
                      />
                    ))}

                  {chatMode === "ai" && aiMessages.length === 0 && (
                    <p className="text-center text-xs text-slate">Mulai chat dengan AI dulu yuk.</p>
                  )}
                  {chatMode === "ai" &&
                    aiMessages.map((message) => (
                      <ChatBubble
                        key={message.id}
                        align={message.role === "user" ? "justify-end" : "justify-start"}
                        tone={
                          message.role === "user"
                            ? "bg-hot/90 text-black"
                            : "bg-ink-3/80 text-soft"
                        }
                        text={message.text}
                      />
                    ))}
                </div>

                {chatMode === "realtime" && (
                  <form onSubmit={handleRealtimeSend} className="mt-4 flex items-center gap-2">
                    <input
                      value={realtimeInput}
                      onChange={(event) => setRealtimeInput(event.target.value)}
                      placeholder="Ketik pesan buat Melfin..."
                      className="flex-1 rounded-2xl border border-hot/30 bg-ink-3/70 px-4 py-2 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-2xl bg-hot px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:scale-105"
                    >
                      <Send size={16} />
                      Kirim
                    </button>
                  </form>
                )}

                {chatMode === "ai" && (
                  <form onSubmit={handleAiSend} className="mt-4 flex items-center gap-2">
                    <input
                      value={aiInput}
                      onChange={(event) => setAiInput(event.target.value)}
                      placeholder="Curhat ke Melpin AI..."
                      className="flex-1 rounded-2xl border border-hot/30 bg-ink-3/70 px-4 py-2 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-2xl bg-hot px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:scale-105"
                    >
                      <Send size={16} />
                      Kirim
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {currentView === "notes" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SectionTitle icon={StickyNote} title="Notes" subtitle="Sticky notes pink neon buat curhat." />
                <button
                  onClick={handleAddNote}
                  className="flex items-center gap-2 rounded-full bg-hot px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:scale-105"
                >
                  <Plus size={16} />
                  Tambah Note
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {notes.length === 0 && (
                  <div className="glass rounded-[28px] p-6 text-sm text-slate">
                    Belum ada catatan. Tambah dulu ya.
                  </div>
                )}
                {notes.map((note) => (
                  <div key={note.id} className="relative rounded-[28px] bg-gradient-to-br from-pink-400/90 via-pink-500/80 to-hot/80 p-5 text-black">
                    <textarea
                      value={note.text}
                      onChange={(event) => handleUpdateNote(note.id, event.target.value)}
                      className="min-h-[160px] w-full resize-none bg-transparent text-sm font-medium text-black outline-none"
                    />
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="absolute right-4 top-4 rounded-full bg-black/20 p-2 text-black transition-all duration-300 hover:bg-black/30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === "reminders" && (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
              <div className="glass rounded-[32px] p-6">
                <SectionTitle icon={Bell} title="Reminders" subtitle="Todo list biar kamu gak lupa." />
                <form onSubmit={handleAddReminder} className="mt-6 flex flex-col gap-3">
                  <input
                    name="reminder"
                    placeholder="Contoh: Minum obat jam 7"
                    className="w-full rounded-2xl border border-hot/30 bg-ink-3/70 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-hot px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:scale-105"
                  >
                    <Plus size={16} />
                    Tambah Reminder
                  </button>
                </form>
                <div className="mt-6 rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3 text-xs text-slate">
                  Pending: <span className="text-soft">{pendingReminderCount}</span>
                </div>
              </div>

              <div className="glass rounded-[32px] p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hot/20 text-hot">
                    <LayoutGrid size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate">Daftar Pengingat</p>
                    <p className="text-lg font-semibold text-white">Checklist Harian</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {reminders.length === 0 && (
                    <div className="rounded-2xl border border-hot/20 bg-ink-3/70 p-4 text-sm text-slate">
                      Belum ada reminder. Tambah dulu ya.
                    </div>
                  )}
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3"
                    >
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={reminder.done}
                          onChange={() => handleToggleReminder(reminder.id)}
                          className="h-4 w-4 accent-pink-400"
                        />
                        <span className={`text-sm ${reminder.done ? "text-slate line-through" : "text-soft"}`}>
                          {reminder.text}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="rounded-full bg-hot/20 p-2 text-hot transition-all duration-300 hover:bg-hot/30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showNav && (
        <nav className="fixed bottom-6 left-1/2 z-40 w-[92%] max-w-4xl -translate-x-1/2">
          <div className="glass flex items-center justify-between rounded-full px-4 py-3">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setCurrentView(item.id)}>
                <NavPill icon={item.icon} label={item.label} active={currentView === item.id} />
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
