import type { SampleUi, UIElement } from '../types/editor';
import { makeIcon, makeShape, makeText, uid } from '../utils/elements';

type Layout = 'hero' | 'dashboard' | 'grid' | 'form' | 'commerce' | 'content';
type Palette = { bg: string; panel: string; soft: string; primary: string; accent: string; text: string; muted: string; good: string };
type Config = { id: string; name: string; category: string; layout: Layout; brand: string; title: string; subtitle: string; icon: string; palette: number };

const palettes: Palette[] = [
  { bg:'#020617', panel:'#0F172A', soft:'#1E293B', primary:'#2563EB', accent:'#7C3AED', text:'#FFFFFF', muted:'#94A3B8', good:'#10B981' },
  { bg:'#071A36', panel:'#0F2A55', soft:'#143B73', primary:'#0EA5E9', accent:'#22D3EE', text:'#FFFFFF', muted:'#BAE6FD', good:'#34D399' },
  { bg:'#150E2F', panel:'#271554', soft:'#3B1E7A', primary:'#8B5CF6', accent:'#EC4899', text:'#FFFFFF', muted:'#DDD6FE', good:'#22C55E' },
  { bg:'#052E2B', panel:'#064E3B', soft:'#115E59', primary:'#10B981', accent:'#A3E635', text:'#ECFDF5', muted:'#A7F3D0', good:'#22C55E' },
  { bg:'#2A1207', panel:'#431407', soft:'#7C2D12', primary:'#F97316', accent:'#FACC15', text:'#FFF7ED', muted:'#FED7AA', good:'#84CC16' },
  { bg:'#0B1120', panel:'#111827', soft:'#1F2937', primary:'#64748B', accent:'#CBD5E1', text:'#F8FAFC', muted:'#94A3B8', good:'#22C55E' },
];

const configs: Config[] = [
  {
    "id": "ai-saas",
    "name": "AI SaaS Landing",
    "category": "Landing",
    "layout": "hero",
    "brand": "Nova AI",
    "title": "Create smarter workflows",
    "subtitle": "A polished web hero with navigation, CTA and product visual.",
    "icon": "✦",
    "palette": 0
  },
  {
    "id": "fintech",
    "name": "Fintech Landing",
    "category": "Landing",
    "layout": "hero",
    "brand": "FluxPay",
    "title": "Payments built for speed",
    "subtitle": "Modern finance landing with trust-focused metrics.",
    "icon": "$",
    "palette": 1
  },
  {
    "id": "agency",
    "name": "Creative Agency",
    "category": "Landing",
    "layout": "hero",
    "brand": "Studio One",
    "title": "Design brands people remember",
    "subtitle": "Bold agency homepage with service blocks.",
    "icon": "◆",
    "palette": 2
  },
  {
    "id": "education",
    "name": "Online Course",
    "category": "Education",
    "layout": "hero",
    "brand": "Learnly",
    "title": "Build skills with guided lessons",
    "subtitle": "Course platform hero with learning card visual.",
    "icon": "🎓",
    "palette": 3
  },
  {
    "id": "restaurant",
    "name": "Restaurant Landing",
    "category": "Local Business",
    "layout": "hero",
    "brand": "Bistro",
    "title": "Fresh taste, warm table",
    "subtitle": "Restaurant landing with reservation CTA.",
    "icon": "🍽",
    "palette": 4
  },
  {
    "id": "admin-dashboard",
    "name": "Admin Dashboard",
    "category": "Dashboard",
    "layout": "dashboard",
    "brand": "Admin Pro",
    "title": "Overview",
    "subtitle": "Sidebar dashboard with KPI and activity cards.",
    "icon": "▥",
    "palette": 0
  },
  {
    "id": "analytics",
    "name": "Analytics Dashboard",
    "category": "Dashboard",
    "layout": "dashboard",
    "brand": "Insight",
    "title": "Performance analytics",
    "subtitle": "Analytics workspace with bars and stats.",
    "icon": "↗",
    "palette": 1
  },
  {
    "id": "crypto",
    "name": "Crypto Dashboard",
    "category": "Dashboard",
    "layout": "dashboard",
    "brand": "CoinDesk",
    "title": "Portfolio overview",
    "subtitle": "Crypto style dashboard with trend panels.",
    "icon": "₿",
    "palette": 2
  },
  {
    "id": "project",
    "name": "Project Dashboard",
    "category": "Dashboard",
    "layout": "dashboard",
    "brand": "TaskBase",
    "title": "Project status",
    "subtitle": "Team project dashboard with task summaries.",
    "icon": "☑",
    "palette": 3
  },
  {
    "id": "sales",
    "name": "Sales Dashboard",
    "category": "Dashboard",
    "layout": "dashboard",
    "brand": "SalesOps",
    "title": "Sales pipeline",
    "subtitle": "Sales dashboard with revenue and leads.",
    "icon": "$",
    "palette": 4
  },
  {
    "id": "product-grid",
    "name": "Product Grid",
    "category": "Commerce",
    "layout": "grid",
    "brand": "ShopKit",
    "title": "Featured products",
    "subtitle": "Product listing grid with filter and cards.",
    "icon": "🛒",
    "palette": 0
  },
  {
    "id": "blog-grid",
    "name": "Blog Article Grid",
    "category": "Content",
    "layout": "grid",
    "brand": "Editorial",
    "title": "Latest insights",
    "subtitle": "Article card grid for blog and content sites.",
    "icon": "▣",
    "palette": 5
  },
  {
    "id": "feature-grid",
    "name": "Feature Grid",
    "category": "Landing",
    "layout": "grid",
    "brand": "LaunchPad",
    "title": "Everything teams need",
    "subtitle": "Feature grid section with icon cards.",
    "icon": "⚙",
    "palette": 1
  },
  {
    "id": "portfolio",
    "name": "Portfolio Gallery",
    "category": "Portfolio",
    "layout": "grid",
    "brand": "Folio",
    "title": "Selected work",
    "subtitle": "Portfolio gallery with clean cards.",
    "icon": "◈",
    "palette": 2
  },
  {
    "id": "realestate",
    "name": "Real Estate Cards",
    "category": "Real Estate",
    "layout": "grid",
    "brand": "SpaceFind",
    "title": "Find your next space",
    "subtitle": "Property cards and real estate section.",
    "icon": "⌂",
    "palette": 3
  },
  {
    "id": "login",
    "name": "Login Page",
    "category": "Form",
    "layout": "form",
    "brand": "SecureID",
    "title": "Welcome back",
    "subtitle": "Login card with inputs and CTA.",
    "icon": "🔐",
    "palette": 0
  },
  {
    "id": "signup",
    "name": "Signup Page",
    "category": "Form",
    "layout": "form",
    "brand": "Joinly",
    "title": "Create account",
    "subtitle": "Signup form with modern web styling.",
    "icon": "＋",
    "palette": 1
  },
  {
    "id": "contact",
    "name": "Contact Page",
    "category": "Form",
    "layout": "form",
    "brand": "Connect",
    "title": "Let us talk",
    "subtitle": "Contact form for landing pages.",
    "icon": "☎",
    "palette": 5
  },
  {
    "id": "checkout",
    "name": "Checkout Form",
    "category": "Commerce",
    "layout": "form",
    "brand": "PayBox",
    "title": "Payment details",
    "subtitle": "Checkout form with secure payment feel.",
    "icon": "💳",
    "palette": 4
  },
  {
    "id": "newsletter",
    "name": "Newsletter Form",
    "category": "Marketing",
    "layout": "form",
    "brand": "Letterly",
    "title": "Join newsletter",
    "subtitle": "Newsletter capture section.",
    "icon": "✉",
    "palette": 2
  },
  {
    "id": "pricing",
    "name": "Pricing Section",
    "category": "Commerce",
    "layout": "commerce",
    "brand": "PriceLab",
    "title": "Simple pricing for teams",
    "subtitle": "Three pricing cards with CTA buttons.",
    "icon": "★",
    "palette": 0
  },
  {
    "id": "ecommerce-hero",
    "name": "E-commerce Hero",
    "category": "Commerce",
    "layout": "commerce",
    "brand": "Marketly",
    "title": "New season essentials",
    "subtitle": "Storefront hero with product cards.",
    "icon": "🛍",
    "palette": 4
  },
  {
    "id": "app-store",
    "name": "App Store Landing",
    "category": "Mobile App",
    "layout": "commerce",
    "brand": "PocketFlow",
    "title": "Your tools in one place",
    "subtitle": "Mobile app website with phone mockup.",
    "icon": "▣",
    "palette": 1
  },
  {
    "id": "travel",
    "name": "Travel Booking",
    "category": "Travel",
    "layout": "commerce",
    "brand": "TripFlow",
    "title": "Find your next escape",
    "subtitle": "Booking search UI with travel CTA.",
    "icon": "✈",
    "palette": 1
  },
  {
    "id": "job-board",
    "name": "Job Board",
    "category": "Marketplace",
    "layout": "commerce",
    "brand": "Hirely",
    "title": "Find remote product roles",
    "subtitle": "Job board search and listing layout.",
    "icon": "💼",
    "palette": 5
  },
  {
    "id": "docs",
    "name": "Docs Portal",
    "category": "Docs",
    "layout": "content",
    "brand": "DocsKit",
    "title": "Build with clean APIs",
    "subtitle": "Developer docs portal with search and cards.",
    "icon": "⌘",
    "palette": 5
  },
  {
    "id": "support",
    "name": "Support Center",
    "category": "Support",
    "layout": "content",
    "brand": "HelpHub",
    "title": "How can we help?",
    "subtitle": "FAQ and support center homepage.",
    "icon": "?",
    "palette": 3
  },
  {
    "id": "event",
    "name": "Event Page",
    "category": "Event",
    "layout": "content",
    "brand": "ConfX",
    "title": "Design Systems Summit",
    "subtitle": "Conference landing page with speaker card.",
    "icon": "🎤",
    "palette": 2
  },
  {
    "id": "video",
    "name": "Video Platform",
    "category": "Media",
    "layout": "content",
    "brand": "StreamX",
    "title": "Stream stories beautifully",
    "subtitle": "Video platform landing with media preview.",
    "icon": "▶",
    "palette": 0
  },
  {
    "id": "health",
    "name": "Healthcare Site",
    "category": "Health",
    "layout": "content",
    "brand": "CareFlow",
    "title": "Manage care with clarity",
    "subtitle": "Clean healthcare website section.",
    "icon": "♡",
    "palette": 3
  }
];

function t(name: string, value: string, x: number, y: number, w: number, h: number, size = 22, color = '#FFFFFF', weight = 700) {
  const el = makeText();
  Object.assign(el, { id: uid('web-text'), name, text: value, x, y, w, h, fontSize: size, textColor: color, fontWeight: weight });
  return el;
}
function b(shapeId: string, name: string, x: number, y: number, w: number, h: number, fill: string, text = '', radius?: number) {
  const el = makeShape(shapeId);
  Object.assign(el, { id: uid('web-box'), name, x, y, w, h, fill, text });
  if (typeof radius === 'number') el.radius = radius;
  return el;
}
function ic(symbol: string, name: string, x: number, y: number, size = 42, color = '#FFFFFF') {
  const el = makeIcon(symbol, name);
  Object.assign(el, { id: uid('web-icon'), x, y, w: size, h: size, fontSize: Math.round(size * 0.64), textColor: color, fill: 'transparent' });
  return el;
}
function s(id: string, name: string, category: string, desc: string, elements: UIElement[]): SampleUi { return { id, name, category, desc, elements }; }
function nav(p: Palette, brand: string) { return [b('uiRaisedBar','Top Navigation',36,28,848,68,p.panel,'',24), ic('◆','Logo Mark',62,46,34,p.accent), t('Brand',brand,108,47,180,30,22,p.text), t('Nav Product','Product',390,49,92,28,14,p.text,600), t('Nav Pricing','Pricing',492,49,72,28,14,p.muted,500), t('Nav Docs','Docs',575,49,58,28,14,p.muted,500), b('uiGlossButton','Nav CTA',744,42,110,40,p.primary,'Start',14)]; }
function metrics(p: Palette, y = 420) { return [0,1,2].flatMap(i=>{ const x=56+i*204; const labels=['Conversion','Visitors','Revenue']; const values=['14.8%','84.2K','$92K']; return [b('uiShadowCard',`Metric ${i+1}`,x,y,182,112,p.panel,'',20), t(`Metric Label ${i+1}`,labels[i],x+20,y+24,116,22,13,p.muted,500), t(`Metric Value ${i+1}`,values[i],x+20,y+52,120,36,30,p.text), ic(i===0?'↗':i===1?'●':'▰',`Metric Icon ${i+1}`,x+138,y+50,28,i===0?p.good:i===1?p.accent:p.primary)]; }); }
function hero(c: Config, p: Palette) { return [b('rect','Web Background',0,0,920,560,p.bg,'',0), ...nav(p,c.brand), t('Hero Title',c.title,70,150,470,105,44,p.text,800), t('Hero Subtitle',c.subtitle,72,270,470,58,17,p.muted,500), b('uiGlossButton','Primary CTA',72,356,154,52,p.primary,'Get Started',18), b('uiGhostButton','Secondary CTA',242,356,146,52,p.panel,'Learn More',18), b('ui3dRoundRect','Hero Visual',590,145,250,260,p.soft,'',38), ic(c.icon,'Hero Icon',657,205,120,p.accent), ...metrics(p,440)]; }
function dashboard(c: Config, p: Palette) { return [b('rect','Dashboard BG',0,0,980,620,p.bg,'',0), b('uiShadowCard','Sidebar',32,30,210,560,p.panel,'',24), t('Logo',c.brand,60,60,150,34,23,p.text), b('uiRaisedBar','Menu Dashboard',54,122,164,42,p.primary,'Dashboard',14), b('uiRaisedBar','Menu Projects',54,178,164,42,p.soft,'Projects',14), b('uiRaisedBar','Menu Settings',54,234,164,42,p.soft,'Settings',14), t('Page Title',c.title,286,54,320,46,34,p.text), ic(c.icon,'Header Icon',820,54,52,p.accent), ...metrics(p,120), b('uiShadowCard','Chart Card',286,278,384,240,p.panel,'',24), t('Chart Title','Performance',316,305,220,30,24,p.text), b('uiProgress','Chart Bar 1',320,370,290,22,p.primary,'',999), b('uiProgress','Chart Bar 2',320,420,230,22,p.accent,'',999), b('uiProgress','Chart Bar 3',320,470,170,22,p.good,'',999), b('uiShadowCard','Activity',700,278,220,240,p.panel,'',24), t('Activity Title','Activity',724,306,140,30,23,p.text), ic('✓','Check',730,370,36,p.good), t('Activity 1','Design approved',780,372,120,24,14,p.muted,500), ic('●','Dot',730,420,36,p.primary), t('Activity 2','New feedback',780,422,120,24,14,p.muted,500)]; }
function grid(c: Config, p: Palette) { return [b('rect','Grid BG',0,0,920,620,p.bg,'',0), t('Section Title',c.title,58,48,500,52,40,p.text), t('Section Subtitle',c.subtitle,60,108,620,34,16,p.muted,500), b('uiInput','Search Filter',610,55,240,46,p.panel,'Search',16), ...[0,1,2,3,4,5].flatMap(i=>{ const col=i%3, row=Math.floor(i/3), x=60+col*276, y=175+row*200; return [b('uiShadowCard',`Grid Card ${i+1}`,x,y,240,160,p.panel,'',24), ic(i%2?c.icon:'✦',`Card Icon ${i+1}`,x+24,y+26,44,i%2?p.accent:p.primary), t(`Card Title ${i+1}`,['Design Kit','Analytics','Security','Automation','Commerce','Support'][i],x+82,y+26,130,28,20,p.text), t(`Card Body ${i+1}`,'Clean card block with icon, copy and action state.',x+28,y+80,184,48,13,p.muted,500), b('uiGhostButton',`Card Button ${i+1}`,x+28,y+124,96,28,p.soft,'View',10)]; })]; }
function form(c: Config, p: Palette) { return [b('rect','Form BG',0,0,920,620,p.bg,'',0), b('uiShadowCard','Form Card',290,60,340,500,p.panel,'',28), ic(c.icon,'Form Icon',426,95,68,p.accent), t('Form Title',c.title,334,178,250,40,30,p.text), t('Form Subtitle',c.subtitle,334,220,250,42,14,p.muted,500), b('uiInput','Name Input',334,292,252,48,p.soft,'Name',16), b('uiInput','Email Input',334,356,252,48,p.soft,'Email',16), b('uiInput','Password Input',334,420,252,48,p.soft,'Password',16), b('uiGlossButton','Submit Button',334,500,252,52,p.primary,'Continue',18)]; }
function commerce(c: Config, p: Palette) { return [b('rect','Commerce BG',0,0,960,620,p.bg,'',0), ...nav(p,c.brand), t('Commerce Title',c.title,64,132,460,56,40,p.text), t('Commerce Sub',c.subtitle,66,192,470,44,16,p.muted,500), b('uiShadowCard','Search Box',64,260,780,100,p.panel,'',26), b('uiInput','Search Input',94,286,320,52,p.soft,'Search',16), b('uiInput','Filter Input',434,286,180,52,p.soft,'Filter',16), b('uiGlossButton','Search Button',634,286,150,52,p.primary,'Search',16), ...[0,1,2].flatMap(i=>{ const x=90+i*260; return [b('uiShadowCard',`Commerce Card ${i}`,x,405,220,150,p.panel,'',22), ic(i===0?c.icon:i===1?'★':'✓',`Commerce Icon ${i}`,x+24,430,44,i===0?p.accent:p.primary), t(`Commerce Text ${i}`,['Featured','Popular','Verified'][i],x+82,430,100,28,20,p.text), t(`Commerce Meta ${i}`,'Reusable web section',x+28,484,150,26,13,p.muted,500)]; })]; }
function content(c: Config, p: Palette) { return [b('rect','Content BG',0,0,920,600,p.bg,'',0), ...nav(p,c.brand), t('Content Title',c.title,68,142,470,62,42,p.text), t('Content Sub',c.subtitle,70,220,500,48,16,p.muted,500), b('uiInput','Search Content',68,296,520,54,p.panel,'Search content',18), ...[0,1,2,3].flatMap(i=>{ const x=68+(i%2)*300, y=390+Math.floor(i/2)*88; return [b('uiShadowCard',`Content Card ${i}`,x,y,260,64,p.panel,'',18), ic(i%2?c.icon:'▣',`Content Icon ${i}`,x+20,y+16,32,i%2?p.accent:p.primary), t(`Content ${i}`,['Quickstart','Templates','Resources','Support'][i],x+65,y+18,150,26,17,p.text)]; })]; }
function build(c: Config): UIElement[] { const p=palettes[c.palette]; if(c.layout==='hero') return hero(c,p); if(c.layout==='dashboard') return dashboard(c,p); if(c.layout==='grid') return grid(c,p); if(c.layout==='form') return form(c,p); if(c.layout==='commerce') return commerce(c,p); return content(c,p); }

export function createWebSamples(): SampleUi[] {
  return configs.map(c => s(`web-${c.id}`, c.name, c.category, c.subtitle, build(c)));
}
