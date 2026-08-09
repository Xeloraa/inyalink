-- =============================================================================
-- THROWAWAY DEMO DATA — not for production.
-- Synthetic users, portfolios, and engagements for UI / reputation demos.
-- Safe to wipe. Do not treat as real customers or real work history.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING.
--
-- Counts: 11 categories, 36 professional profiles, 12 client profiles,
--   · 3+ approved pros per category (core + newer verticals)
--   · Varied portfolios: rich (5–7), medium (2–3), sparse (0–1)
--   · work_links on established pros only
--   · ~55 confirmed engagements + declined/cancelled/disputed (reputation)
--   · 10 showcase briefs (submitted / matched / in progress / completed)
--     with timestamps spread over ~6 months
-- Fixed demo login IDs preserved (pro01, client01, admin).
-- No identity documents or phones.
-- Avatars: local generated Southeast Asian portraits in apps/web/public/images/avatars/
--   (no NRC/selfie collection — demo faces only for UI fixtures).
-- Portfolio thumbnails: abstract SVG gradients in apps/web/public/images/portfolio/
--   (no stock photos, no brand logos).
-- =============================================================================

-- ---------------------------------------------------------------- categories

insert into categories (slug, name_my, name_en, sort) values
  ('graphic-design',          'ဂရပ်ဖစ် ဒီဇိုင်း',           'Graphic Design',            0),
  ('photography',             'ဓာတ်ပုံ',                     'Photography',               1),
  ('web-development',         'ဝက်ဘ် ဖွံ့ဖြိုးရေး',          'Web Development',           2),
  ('social-media-marketing',  'လူမှုမီဒီယာ စျေးကွက်',       'Social Media Marketing',    3),
  ('content-writing-burmese', 'မြန်မာ အကြောင်းအရာ ရေးသားခြင်း', 'Content Writing (Burmese)', 4),
  ('video-tiktok-content',    'ဗီဒီယို / TikTok အကြောင်းအရာ', 'Video / TikTok Content',    5),
  ('translation',             'ဘာသာပြန်',                   'Translation',               6),
  ('illustration',            'ပုံဆွဲ / အီလတ်စထရေးရှင်း',   'Illustration',              7),
  ('copywriting',             'ကော်ပီရေးသားခြင်း',         'Copywriting',               8),
  ('virtual-assistant',       'Virtual Assistant',         'Virtual Assistant',         9),
  ('other',                   'အခြား',                     'Other',                     10)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------- auth.users
-- profiles.id → auth.users(id). Demo-only accounts; password is not for login use.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  crypt('demo-not-for-login', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('avatar_url', u.avatar_url),
  now(),
  now(),
  '',
  '',
  '',
  ''
from (
  values
    -- professionals 01–15 (local SEA portraits)
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'demo+pro01@inyalink.local',
     '/images/avatars/pro01.jpg'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'demo+pro02@inyalink.local',
     '/images/avatars/pro02.jpg'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'demo+pro03@inyalink.local',
     '/images/avatars/pro03.jpg'),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'demo+pro04@inyalink.local',
     '/images/avatars/pro04.jpg'),
    ('a0000000-0000-4000-8000-000000000005'::uuid, 'demo+pro05@inyalink.local',
     '/images/avatars/pro05.jpg'),
    ('a0000000-0000-4000-8000-000000000006'::uuid, 'demo+pro06@inyalink.local',
     '/images/avatars/pro06.jpg'),
    ('a0000000-0000-4000-8000-000000000007'::uuid, 'demo+pro07@inyalink.local',
     '/images/avatars/pro07.jpg'),
    ('a0000000-0000-4000-8000-000000000008'::uuid, 'demo+pro08@inyalink.local',
     '/images/avatars/pro08.jpg'),
    ('a0000000-0000-4000-8000-000000000009'::uuid, 'demo+pro09@inyalink.local',
     '/images/avatars/pro09.jpg'),
    ('a0000000-0000-4000-8000-00000000000a'::uuid, 'demo+pro10@inyalink.local',
     '/images/avatars/pro11.jpg'),
    ('a0000000-0000-4000-8000-00000000000b'::uuid, 'demo+pro11@inyalink.local',
     '/images/avatars/pro10.jpg'),
    ('a0000000-0000-4000-8000-00000000000c'::uuid, 'demo+pro12@inyalink.local',
     '/images/avatars/pro13.jpg'),
    ('a0000000-0000-4000-8000-00000000000d'::uuid, 'demo+pro13@inyalink.local',
     '/images/avatars/pro12.jpg'),
    ('a0000000-0000-4000-8000-00000000000e'::uuid, 'demo+pro14@inyalink.local',
     '/images/avatars/pro14.jpg'),
    ('a0000000-0000-4000-8000-00000000000f'::uuid, 'demo+pro15@inyalink.local',
     '/images/avatars/pro15.jpg'),
    -- professionals 16–29 (new categories; reuse local portraits)
    ('a0000000-0000-4000-8000-000000000010'::uuid, 'demo+pro16@inyalink.local',
     '/images/avatars/pro01.jpg'),
    ('a0000000-0000-4000-8000-000000000011'::uuid, 'demo+pro17@inyalink.local',
     '/images/avatars/pro02.jpg'),
    ('a0000000-0000-4000-8000-000000000012'::uuid, 'demo+pro18@inyalink.local',
     '/images/avatars/pro03.jpg'),
    ('a0000000-0000-4000-8000-000000000013'::uuid, 'demo+pro19@inyalink.local',
     '/images/avatars/pro04.jpg'),
    ('a0000000-0000-4000-8000-000000000014'::uuid, 'demo+pro20@inyalink.local',
     '/images/avatars/pro05.jpg'),
    ('a0000000-0000-4000-8000-000000000015'::uuid, 'demo+pro21@inyalink.local',
     '/images/avatars/pro06.jpg'),
    ('a0000000-0000-4000-8000-000000000016'::uuid, 'demo+pro22@inyalink.local',
     '/images/avatars/pro07.jpg'),
    ('a0000000-0000-4000-8000-000000000017'::uuid, 'demo+pro23@inyalink.local',
     '/images/avatars/pro08.jpg'),
    ('a0000000-0000-4000-8000-000000000018'::uuid, 'demo+pro24@inyalink.local',
     '/images/avatars/pro09.jpg'),
    ('a0000000-0000-4000-8000-000000000019'::uuid, 'demo+pro25@inyalink.local',
     '/images/avatars/pro10.jpg'),
    ('a0000000-0000-4000-8000-00000000001a'::uuid, 'demo+pro26@inyalink.local',
     '/images/avatars/pro11.jpg'),
    ('a0000000-0000-4000-8000-00000000001b'::uuid, 'demo+pro27@inyalink.local',
     '/images/avatars/pro12.jpg'),
    ('a0000000-0000-4000-8000-00000000001c'::uuid, 'demo+pro28@inyalink.local',
     '/images/avatars/pro13.jpg'),
    ('a0000000-0000-4000-8000-00000000001d'::uuid, 'demo+pro29@inyalink.local',
     '/images/avatars/pro14.jpg'),
    -- professionals 30–36 (3rd pro per newer vertical; sparse / newer profiles)
    ('a0000000-0000-4000-8000-00000000001e'::uuid, 'demo+pro30@inyalink.local',
     '/images/avatars/pro15.jpg'),
    ('a0000000-0000-4000-8000-00000000001f'::uuid, 'demo+pro31@inyalink.local',
     '/images/avatars/pro01.jpg'),
    ('a0000000-0000-4000-8000-000000000020'::uuid, 'demo+pro32@inyalink.local',
     '/images/avatars/pro02.jpg'),
    ('a0000000-0000-4000-8000-000000000021'::uuid, 'demo+pro33@inyalink.local',
     '/images/avatars/pro03.jpg'),
    ('a0000000-0000-4000-8000-000000000022'::uuid, 'demo+pro34@inyalink.local',
     '/images/avatars/pro04.jpg'),
    ('a0000000-0000-4000-8000-000000000023'::uuid, 'demo+pro35@inyalink.local',
     '/images/avatars/pro05.jpg'),
    ('a0000000-0000-4000-8000-000000000024'::uuid, 'demo+pro36@inyalink.local',
     '/images/avatars/pro06.jpg'),
    -- clients 01–12
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'demo+client01@inyalink.local',
     'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'demo+client02@inyalink.local',
     'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'demo+client03@inyalink.local',
     'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'demo+client04@inyalink.local',
     'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'demo+client05@inyalink.local',
     'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'demo+client06@inyalink.local',
     'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'demo+client07@inyalink.local',
     'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'demo+client08@inyalink.local',
     'https://images.unsplash.com/photo-1548142813-c348350df52b?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'demo+client09@inyalink.local',
     'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-00000000000a'::uuid, 'demo+client10@inyalink.local',
     'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-00000000000b'::uuid, 'demo+client11@inyalink.local',
     'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400&h=400&fit=crop&crop=faces&q=80'),
    ('b0000000-0000-4000-8000-00000000000c'::uuid, 'demo+client12@inyalink.local',
     'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=faces&q=80'),
    -- local admin (ops console)
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'demo+admin@inyalink.local',
     '/images/avatars/pro01.jpg')
) as u(id, email, avatar_url)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- profiles

insert into profiles (id, role, display_name, locale) values
  -- professionals (fictional names only)
  ('a0000000-0000-4000-8000-000000000001', 'professional', 'မင်းထက် · Min Thet', 'my'),
  ('a0000000-0000-4000-8000-000000000002', 'professional', 'သူဇာ · Su Zar', 'my'),
  ('a0000000-0000-4000-8000-000000000003', 'professional', 'နေလင်း · Nay Lin', 'my'),
  ('a0000000-0000-4000-8000-000000000004', 'professional', 'ခိုင်ဇော် · Khine Zaw', 'my'),
  ('a0000000-0000-4000-8000-000000000005', 'professional', 'ဖြူဖြူ · Phyu Phyu', 'my'),
  ('a0000000-0000-4000-8000-000000000006', 'professional', 'အောင်ကို · Aung Ko', 'my'),
  ('a0000000-0000-4000-8000-000000000007', 'professional', 'သီရိ · Thiri', 'my'),
  ('a0000000-0000-4000-8000-000000000008', 'professional', 'မျိုးမင်း · Myo Min', 'my'),
  ('a0000000-0000-4000-8000-000000000009', 'professional', 'ဝင်းထွဋ် · Win Htut', 'my'),
  ('a0000000-0000-4000-8000-00000000000a', 'professional', 'စုစု · Su Su', 'my'),
  ('a0000000-0000-4000-8000-00000000000b', 'professional', 'ကျော်ဇေယျ · Kyaw Zeya', 'my'),
  ('a0000000-0000-4000-8000-00000000000c', 'professional', 'မေသူ · May Thu', 'my'),
  ('a0000000-0000-4000-8000-00000000000d', 'professional', 'ထွန်းလင်း · Tun Lin', 'my'),
  ('a0000000-0000-4000-8000-00000000000e', 'professional', 'နှင်းဥမ္မာ · Hnin Ohmar', 'my'),
  ('a0000000-0000-4000-8000-00000000000f', 'professional', 'စိုင်းမောင် · Sai Maung', 'my'),
  ('a0000000-0000-4000-8000-000000000010', 'professional', 'မြတ်နိုး · Myat Noe', 'my'),
  ('a0000000-0000-4000-8000-000000000011', 'professional', 'ဇော်မင်း · Zaw Min', 'my'),
  ('a0000000-0000-4000-8000-000000000012', 'professional', 'နန္ဒာ · Nanda', 'my'),
  ('a0000000-0000-4000-8000-000000000013', 'professional', 'ကိုကို · Ko Ko', 'my'),
  ('a0000000-0000-4000-8000-000000000014', 'professional', 'သဇင် · Thazin', 'my'),
  ('a0000000-0000-4000-8000-000000000015', 'professional', 'ရန်နိုင် · Yan Naing', 'my'),
  ('a0000000-0000-4000-8000-000000000016', 'professional', 'ခင်မျိုး · Khin Myo', 'my'),
  ('a0000000-0000-4000-8000-000000000017', 'professional', 'အေးချမ်း · Aye Chan', 'my'),
  ('a0000000-0000-4000-8000-000000000018', 'professional', 'မင်းခေါင် · Min Khant', 'my'),
  ('a0000000-0000-4000-8000-000000000019', 'professional', 'စုမြတ် · Su Myat', 'my'),
  ('a0000000-0000-4000-8000-00000000001a', 'professional', 'နေမာန် · Nay Marn', 'my'),
  ('a0000000-0000-4000-8000-00000000001b', 'professional', 'ဖြူဇာ · Phyu Zar', 'my'),
  ('a0000000-0000-4000-8000-00000000001c', 'professional', 'ဟိန်းထက် · Hein Thet', 'my'),
  ('a0000000-0000-4000-8000-00000000001d', 'professional', 'ရွှေရည် · Shwe Yee', 'my'),
  ('a0000000-0000-4000-8000-00000000001e', 'professional', 'အိမ့်သွယ် · Eaint Thwel', 'my'),
  ('a0000000-0000-4000-8000-00000000001f', 'professional', 'ကျော်စွာ · Kyaw Swar', 'my'),
  ('a0000000-0000-4000-8000-000000000020', 'professional', 'မြင့်မြတ် · Myint Myat', 'my'),
  ('a0000000-0000-4000-8000-000000000021', 'professional', 'နွေဦး · Nwe Oo', 'my'),
  ('a0000000-0000-4000-8000-000000000022', 'professional', 'စိုးမိုး · Soe Moe', 'my'),
  ('a0000000-0000-4000-8000-000000000023', 'professional', 'ဝတ်ရည် · Wutt Yee', 'my'),
  ('a0000000-0000-4000-8000-000000000024', 'professional', 'တင်မောင် · Tin Maung', 'my'),
  -- clients (fictional shop / founder names)
  ('b0000000-0000-4000-8000-000000000001', 'client', 'ရွှေကော်ဖီ · Shwe Coffee', 'my'),
  ('b0000000-0000-4000-8000-000000000002', 'client', 'မြန်မာလက်မှု · Myanmar Craft Co', 'my'),
  ('b0000000-0000-4000-8000-000000000003', 'client', 'Green Bowl Kitchen', 'en'),
  ('b0000000-0000-4000-8000-000000000004', 'client', 'ပန်းသီး စတိုး · Apple Lane Shop', 'my'),
  ('b0000000-0000-4000-8000-000000000005', 'client', 'ယုဇန အလှကုန် · Yuzana Beauty', 'my'),
  ('b0000000-0000-4000-8000-000000000006', 'client', 'Riverbend Studio', 'en'),
  ('b0000000-0000-4000-8000-000000000007', 'client', 'မန္တလေးစာအုပ် · Mandalay Books', 'my'),
  ('b0000000-0000-4000-8000-000000000008', 'client', 'ထွန်းလင်း ကော်ဖီ · Tun Lin Cafe', 'my'),
  ('b0000000-0000-4000-8000-000000000009', 'client', 'Horizon Logistics', 'en'),
  ('b0000000-0000-4000-8000-00000000000a', 'client', 'ပုလဲ အိမ် · Pearl Homestay', 'my'),
  ('b0000000-0000-4000-8000-00000000000b', 'client', 'စိမ်းလန်း စျေး · Sein Lan Market', 'my'),
  ('b0000000-0000-4000-8000-00000000000c', 'client', 'North Gate Apparel', 'en'),
  -- local admin (ops console)
  ('c0000000-0000-4000-8000-000000000001', 'admin', 'Demo Admin', 'en')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- professionals (approved)

insert into professionals (
  user_id, category_id, headline_my, headline_en, bio_my, bio_en,
  skills, status, reviewed_at, typical_turnaround_days, min_budget_mmk, accepting_work
)
select
  p.user_id,
  c.id,
  p.headline_my,
  p.headline_en,
  p.bio_my,
  p.bio_en,
  p.skills,
  'approved'::pro_status,
  now() - interval '40 days',
  p.turnaround,
  p.min_budget,
  true
from (
  values
    -- graphic-design (4) — mix of veterans and mid-career
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'graphic-design',
     'လိုဂိုနှင့် ဘရန်းဒ် ဒီဇိုင်း', 'Logo and brand design',
     'ရန်ကုန်နှင့် မန္တလေးရှိ အသေးစားလုပ်ငန်း ၄၀+ အတွက် လိုဂို၊ အမှတ်တံဆိပ် လမ်းညွှန်နှင့် ထုပ်ပိုးမှု အခြေခံ ပက်ကေ့ချ်များ ဖန်တီးပေးခဲ့သည်။ ကော်ဖီဆိုင်၊ လက်မှုပစ္စည်းနှင့် အလှကုန် အမှတ်တံဆိပ်များကို အထူးပြုသည်။',
     'Eight years designing logo systems, brand guides, and packaging starters for 40+ small businesses across Yangon and Mandalay. Cafe, craft, and beauty brands are a specialty.',
     array['logo','branding','packaging'], 5, 150000::bigint),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'graphic-design',
     'ပိုစတာနှင့် လူမှုမီဒီယာ ပုံများ', 'Posters and social graphics',
     'ပွဲတော်၊ ဆိုင်ဖွင့်ပွဲနှင့် ကမ်ပိန်းအတွက် ပုံများ ရေးဆွဲသည်။',
     'Campaign posters and social assets for openings and events.',
     array['poster','illustration','social-graphics'], 3, 80000::bigint),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'graphic-design',
     'ထုတ်ကုန်ထုပ်ပိုးမှု ဒီဇိုင်း', 'Product packaging design',
     'အစားအသောက်နှင့် လက်မှုပစ္စည်း ထုပ်ပိုးမှုကို ငါးနှစ်ကျော် လုပ်ကိုင်ခဲ့သည်။ ပရင့်အတွက် CMYK နှင့် ဒိုင်းဖတ် ဖိုင်များ အဆင်သင့် ပေးသည်။',
     'Five-plus years on food and handmade packaging. Delivers print-ready CMYK and die-line files.',
     array['packaging','label','print'], 7, 200000::bigint),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'graphic-design',
     'မီနူးနှင့် ပရင့်ပစ္စည်း', 'Menus and print collateral',
     'ကော်ဖီဆိုင် မီနူးနှင့် လက်ကမ်းစာရွက်များ စတင်လက်ခံနေသည်။',
     'Just starting — cafe menus and flyers.',
     array['menu','print','layout'], 4, 100000::bigint),
    -- photography (4)
    ('a0000000-0000-4000-8000-000000000005'::uuid, 'photography',
     'ထုတ်ကုန်ဓာတ်ပုံ', 'Product photography',
     'အွန်လိုင်းစတိုးနှင့် Facebook စာမျက်နှာအတွက် ထုတ်ကုန်ပုံ ရာနှင့်ချီ ရိုက်ပြီးပါပြီ။ စတူဒီယိုနှင့် သဘာဝအလင်း နှစ်မျိုးလုံး လုပ်နိုင်သည်။',
     'Hundreds of catalogue shots for online shops and Facebook pages. Studio and natural light.',
     array['product','studio','retouch'], 4, 120000::bigint),
    ('a0000000-0000-4000-8000-000000000006'::uuid, 'photography',
     'အစားအသောက် ဓာတ်ပုံ', 'Food photography',
     'မီနူးနှင့် ဆိုရှယ်အတွက် အစားအသောက်ပုံများ။',
     'Food photography for menus and social.',
     array['food','lifestyle','lighting'], 3, 100000::bigint),
    ('a0000000-0000-4000-8000-000000000007'::uuid, 'photography',
     'ပွဲနှင့် ပုံတူ ဓာတ်ပုံ', 'Event and portrait photography',
     'ဆိုင်ဖွင့်ပွဲ၊ အလုပ်ရုံပွဲနှင့် ပုံတူရိုက်ကူးမှု။ ရန်ကုန်မြို့တွင်း အမြန်ချိန်းဆိုနိုင်သည်။',
     'Openings, workshops, and portraits. Same-week bookings in Yangon.',
     array['event','portrait','editing'], 5, 180000::bigint),
    ('a0000000-0000-4000-8000-000000000008'::uuid, 'photography',
     'အဆောက်အအုံနှင့် အတွင်းပိုင်း', 'Architecture and interiors',
     'ဆိုင်နှင့် ရုံး အတွင်းပိုင်း ဓာတ်ပုံ။',
     'Interior and shopfront photography.',
     array['interior','architecture','hdr'], 6, 220000::bigint),
    -- web-development (4)
    ('a0000000-0000-4000-8000-000000000009'::uuid, 'web-development',
     'စီးပွားရေး ဝက်ဘ်ဆိုက်', 'Business websites',
     'အသေးစားလုပ်ငန်း ဝက်ဘ်ဆိုက် ၃၀+ တည်ဆောက်ခဲ့သည်။ မြန်ဆန်သော static/landing နှင့် မိုဘိုင်း-ဦးစားပေး ဒီဇိုင်းကို အဓိကထားသည်။ ၃ဂျီ ကွန်ရက်ပေါ်မှာလည်း ဖွင့်လွယ်အောင် အလေးထားသည်။',
     'Built 30+ marketing sites for SMEs. Fast static/landing builds, mobile-first, tuned for slow 3G.',
     array['html','css','responsive'], 10, 500000::bigint),
    ('a0000000-0000-4000-8000-00000000000a'::uuid, 'web-development',
     'အွန်လိုင်းစတိုး အခြေခံ', 'Basic online stores',
     'ကုန်ပစ္စည်းစာရင်းနှင့် အော်ဒါလက်ခံသည့် စတိုးအခြေခံ။',
     'Simple storefronts with catalogue and orders.',
     array['ecommerce','shopify-like','forms'], 14, 800000::bigint),
    ('a0000000-0000-4000-8000-00000000000b'::uuid, 'web-development',
     'Landing page နှင့် ဖောင်', 'Landing pages and forms',
     'ကမ်ပိန်း landing page နှင့် ဖောင်ချိတ်ဆက်မှု။ Facebook Ads နှင့် တွဲသုံးရန် အဆင်သင့်။',
     'Campaign landing pages with lead forms, ready for Facebook Ads.',
     array['landing','tailwind','forms'], 5, 250000::bigint),
    ('a0000000-0000-4000-8000-00000000000c'::uuid, 'web-development',
     'ဝက်ဘ် ပြုပြင်ထိန်းသိမ်းမှု', 'Site fixes and maintenance',
     'ရှိပြီးသားဆိုက် အသေးစား ပြင်ဆင်မှုများ လက်ခံသည်။',
     'Small site fixes — newer to the platform.',
     array['wordpress','performance','bugfix'], 3, 80000::bigint),
    -- social-media-marketing (3)
    ('a0000000-0000-4000-8000-00000000000d'::uuid, 'social-media-marketing',
     'Facebook / Instagram စီမံခန့်ခွဲမှု', 'Facebook / Instagram management',
     'လစဉ် ပို့စ်အစီအစဉ်၊ စာမျက်နှာ စီမံမှုနှင့် အခြေခံ ကြော်ငြာ စနစ်သတ်မှတ်မှု။ ကော်ဖီဆိုင်နှင့် လက်လီဆိုင် အတွေ့အကြုံ များသည်။',
     'Monthly calendars, page management, and light ads setup. Strong cafe and retail experience.',
     array['facebook','instagram','calendar'], 7, 200000::bigint),
    ('a0000000-0000-4000-8000-00000000000e'::uuid, 'social-media-marketing',
     'အကြောင်းအရာရေးသားမှု', 'Content writing for social',
     'မြန်မာ/အင်္ဂလိပ် ပို့စ်စာသားနှင့် ကက်ပရှင်းများ။',
     'Burmese/English captions and post copy.',
     array['copywriting','caption','my-en'], 4, 120000::bigint),
    ('a0000000-0000-4000-8000-00000000000f'::uuid, 'social-media-marketing',
     'ကြော်ငြာကမ်ပိန်း အခြေခံ', 'Basic paid social campaigns',
     'အသေးစား လုပ်ငန်းအတွက် ဘူစ့်/ကြော်ငြာ စနစ်သတ်မှတ်မှု။',
     'Boost and ads setup for small shops.',
     array['ads','boost','analytics'], 5, 180000::bigint)
) as p(user_id, slug, headline_my, headline_en, bio_my, bio_en, skills, turnaround, min_budget)
join categories c on c.slug = p.slug
on conflict (user_id) do nothing;

-- Newer verticals: 3 pros each so browse/matching never look empty.
insert into professionals (
  user_id, category_id, category_other_text, headline_my, headline_en, bio_my, bio_en,
  skills, status, reviewed_at, typical_turnaround_days, min_budget_mmk, accepting_work
)
select
  p.user_id,
  c.id,
  p.category_other_text,
  p.headline_my,
  p.headline_en,
  p.bio_my,
  p.bio_en,
  p.skills,
  'approved'::pro_status,
  now() - interval '20 days',
  p.turnaround,
  p.min_budget,
  true
from (
  values
    -- content-writing-burmese (3)
    ('a0000000-0000-4000-8000-000000000010'::uuid, 'content-writing-burmese', null::text,
     'မြန်မာ ဘလော့နှင့် ဆောင်းပါး', 'Burmese blogs and articles',
     'လုပ်ငန်း ဘလော့၊ ဆောင်းပါးနှင့် Facebook ရှည်လျားစာသားများကို မြန်မာလို ရေးသားသည်။ စာဖတ်သူနားလည်လွယ်အောင် တိုရှင်းစွာ ရေးသည်။',
     'Burmese blogs, articles, and long-form Facebook posts for small businesses. Clear and concise.',
     array['articles','blog','editing'], 5, 80000::bigint),
    ('a0000000-0000-4000-8000-000000000011'::uuid, 'content-writing-burmese', null,
     'ထုတ်ကုန်စာမျက်နှာ စာသား', 'Product page copy in Burmese',
     'အွန်လိုင်းစတိုး ထုတ်ကုန် ဖော်ပြချက်များကို မြန်မာလို ရေးသည်။',
     'Clear Burmese product descriptions for online shops.',
     array['product-copy','scripts','blog'], 4, 60000::bigint),
    ('a0000000-0000-4000-8000-00000000001e'::uuid, 'content-writing-burmese', null,
     'သတင်းနှင့် အကြောင်းအရာ အသစ်', 'News-style and fresh copy',
     'ပလက်ဖောင်းသို့ မကြာသေးမီက ဝင်ရောက်သည်။ တိုတောင်းသော သတင်းပုံစံ စာသားများ လက်ခံသည်။',
     'Newer on the platform. Takes short news-style Burmese copy jobs.',
     array['news','blog','caption'], 3, 50000::bigint),
    -- video-tiktok-content (3)
    ('a0000000-0000-4000-8000-000000000012'::uuid, 'video-tiktok-content', null,
     'TikTok / Reels ရိုက်ကူးခြင်း', 'TikTok and Reels production',
     'ဆိုင်နှင့် ထုတ်ကုန်အတွက် တိုတောင်းသော ဗီဒီယို ရာနှင့်ချီ ရိုက်ပြီး တည်းဖြတ်ခဲ့သည်။ ရန်ကုန်မြို့တွင်း ရိုက်ကွင်း သွားနိုင်သည်။',
     'Shot and edited hundreds of short-form clips for shops and products. On-location in Yangon.',
     array['tiktok','reels','shooting'], 6, 120000::bigint),
    ('a0000000-0000-4000-8000-000000000013'::uuid, 'video-tiktok-content', null,
     'ဗီဒီယို တည်းဖြတ်ခြင်း', 'Short-form video editing',
     'ရိုက်ပြီးသား ကလစ်များကို TikTok ပုံစံ တည်းဖြတ်သည်။',
     'Edits raw clips into TikTok-ready posts.',
     array['editing','captions','reels'], 4, 90000::bigint),
    ('a0000000-0000-4000-8000-00000000001f'::uuid, 'video-tiktok-content', null,
     'ဆိုင်ဖွင့်ပွဲ ကလစ်များ', 'Opening-day clips',
     'ဆိုင်ဖွင့်ပွဲနှင့် ပရိုမို တိုကလစ်များ စတင်လက်ခံသည်။',
     'Just starting — opening-day and promo clips.',
     array['tiktok','event','shooting'], 5, 80000::bigint),
    -- translation (3)
    ('a0000000-0000-4000-8000-000000000014'::uuid, 'translation', null,
     'မြန်မာ ↔ အင်္ဂလိပ် စာရွက်စာတမ်း', 'Myanmar ↔ English documents',
     'လုပ်ငန်းစာ၊ ဝက်ဘ်စာသားနှင့် မီနူး ဘာသာပြန် အတွေ့အကြုံ များသည်။ သဘာဝကျသော မြန်မာစာကို အလေးထားသည်။',
     'Business docs, website copy, and menus — Myanmar ↔ English. Natural Burmese preferred over literal calques.',
     array['my-en','en-my','documents'], 5, 70000::bigint),
    ('a0000000-0000-4000-8000-000000000015'::uuid, 'translation', null,
     'စာတန်းနှင့် ဗီဒီယို စာသား', 'Subtitles and video scripts',
     'ဗီဒီယို စာတန်းထိုးနှင့် စကားပြောစာသား ဘာသာပြန်။',
     'Subtitles and spoken-script translation.',
     array['subtitling','my-en','website'], 4, 65000::bigint),
    ('a0000000-0000-4000-8000-000000000020'::uuid, 'translation', null,
     'အီးမေးလ်နှင့် စာတို ဘာသာပြန်', 'Email and short-form translation',
     'အီးမေးလ်နှင့် စာတို တိုတောင်းသော ဘာသာပြန်များကို လက်ခံသည်။',
     'Newer translator — emails and short messages.',
     array['email','my-en','en-my'], 2, 40000::bigint),
    -- illustration (3)
    ('a0000000-0000-4000-8000-000000000016'::uuid, 'illustration', null,
     'ဒစ်ဂျစ်တယ် ပုံဆွဲ', 'Digital illustration',
     'ကာတွန်းဇာတ်ကောင်၊ တည်းဖြတ်ပုံနှင့် ကမ်ပိန်း ပုံများကို ဒစ်ဂျစ်တယ်ဖြင့် ဆွဲသည်။ အမှတ်တံဆိပ်နှင့် ကိုက်ညီအောင် စတိုင် သတ်မှတ်ပေးနိုင်သည်။',
     'Digital characters, editorial art, and campaign illustrations. Can lock a style to match a brand.',
     array['digital','character','editorial'], 7, 150000::bigint),
    ('a0000000-0000-4000-8000-000000000017'::uuid, 'illustration', null,
     'ထုပ်ပိုးမှု ပုံဆွဲ', 'Packaging illustration',
     'အစားအသောက် ထုပ်ပိုးမှုအတွက် လက်ရေးပုံများ။',
     'Hand-drawn style art for food packaging.',
     array['packaging','storyboard','digital'], 8, 180000::bigint),
    ('a0000000-0000-4000-8000-000000000021'::uuid, 'illustration', null,
     'စတစ်ကာနှင့် အိုင်ကွန်', 'Stickers and icons',
     'စတစ်ကာနှင့် ရိုးရှင်းသော အိုင်ကွန် စက်များ စတင်ဆွဲနေသည်။',
     'Newer illustrator — stickers and simple icon sets.',
     array['icons','sticker','digital'], 5, 70000::bigint),
    -- copywriting (3)
    ('a0000000-0000-4000-8000-000000000018'::uuid, 'copywriting', null,
     'ကြော်ငြာနှင့် landing စာသား', 'Ads and landing copy',
     'မြန်မာ/အင်္ဂလိပ် ကြော်ငြာနှင့် landing page စာသား။ အသံအရောင် (brand voice) ကို ရှင်းလင်းစွာ ထိန်းသည်။',
     'Burmese/English ad and landing-page copy with a clear brand voice.',
     array['ads','landing','brand-voice'], 4, 90000::bigint),
    ('a0000000-0000-4000-8000-000000000019'::uuid, 'copywriting', null,
     'အီးမေးလ်နှင့် ကမ်ပိန်း စာသား', 'Email and campaign copy',
     'ကမ်ပိန်း အီးမေးလ်နှင့် စီးရီး စာသားများ။',
     'Email sequences and campaign copy.',
     array['email','ads','my-en'], 5, 100000::bigint),
    ('a0000000-0000-4000-8000-000000000022'::uuid, 'copywriting', null,
     'ဆိုရှယ် ကက်ပရှင်း တို', 'Short social captions',
     'Facebook / Instagram ကက်ပရှင်း တိုများကို လက်ခံသည်။',
     'Newer copywriter — short social captions.',
     array['caption','social','my-en'], 2, 45000::bigint),
    -- virtual-assistant (3)
    ('a0000000-0000-4000-8000-00000000001a'::uuid, 'virtual-assistant', null,
     'အချိန်ဇယားနှင့် အင်ဘောက်စ်', 'Scheduling and inbox support',
     'ချိန်းဆိုမှု၊ အီးမေးလ် စီမံမှုနှင့် အစည်းအဝေး မှတ်စုများကို လစဉ် ကူညီပေးသည်။ အင်္ဂလိပ်/မြန်မာ နှစ်ဘာသာ။',
     'Monthly calendar, inbox, and meeting-note support. Burmese and English.',
     array['scheduling','inbox','research'], 3, 200000::bigint),
    ('a0000000-0000-4000-8000-00000000001b'::uuid, 'virtual-assistant', null,
     'ဒေတာနှင့် ဖောက်သည် စောင့်ရှောက်မှု', 'Data entry and light care',
     'အမှာစာ မှတ်တမ်းနှင့် အခြေခံ ဖောက်သည် စောင့်ရှောက်မှု။',
     'Order logs and light customer care.',
     array['data-entry','customer-care','inbox'], 4, 180000::bigint),
    ('a0000000-0000-4000-8000-000000000023'::uuid, 'virtual-assistant', null,
     'ဖိုင်စီစဉ်နှင့် စာရင်း', 'File sorting and lists',
     'ဖိုင်စီစဉ်နှင့် စာရင်း အသေးစား အကူအညီ စတင်လက်ခံသည်။',
     'Newer VA — file sorting and simple lists.',
     array['files','lists','data-entry'], 3, 120000::bigint),
    -- other (3) — free-text specialty stored for ops
    ('a0000000-0000-4000-8000-00000000001c'::uuid, 'other',
     'Event staffing coordination for Yangon cafe openings',
     'ပွဲ စီစဉ်မှု အကူ', 'Event staffing coordination',
     'ဆိုင်ဖွင့်ပွဲအတွက် ဝန်ထမ်း စီစဉ်ပေးသည်။ ရန်ကုန်မြို့တွင်း အတွေ့အကြုံ ရှိသည်။',
     'Coordinates day-of staffing for cafe and shop openings in Yangon.',
     array['general','custom'], 6, 150000::bigint),
    ('a0000000-0000-4000-8000-00000000001d'::uuid, 'other',
     'Custom embroidery digitizing for uniforms',
     'အထည်အလိပ် ဒီဂျစ်တယ်ပုံ', 'Embroidery digitizing',
     'ယူနီဖောင်းအတွက် အထည်အလိပ် ဒီဇိုင်း ဒီဂျစ်တယ်လုပ်သည်။',
     'Digitizes logo artwork for uniform embroidery machines.',
     array['custom','multi-skill'], 5, 110000::bigint),
    ('a0000000-0000-4000-8000-000000000024'::uuid, 'other',
     'Pop-up booth layout for weekend markets',
     'ပေါ့ပ်အပ် ဆိုင်ခင်း', 'Pop-up booth layout',
     'ဈေးရက် ပေါ့ပ်အပ် ဆိုင်ခင်း အကြံပြုချက် စတင်ပေးသည်။',
     'Newer — weekend market pop-up booth layout tips.',
     array['custom','general'], 4, 90000::bigint)
) as p(user_id, slug, category_other_text, headline_my, headline_en, bio_my, bio_en, skills, turnaround, min_budget)
join categories c on c.slug = p.slug
on conflict (user_id) do nothing;

-- Refresh bios / tenure on re-seed (ON CONFLICT above skips updates).
update professionals set
  bio_my = v.bio_my,
  bio_en = v.bio_en,
  reviewed_at = now() - v.reviewed_ago,
  created_at = now() - v.created_ago,
  updated_at = now()
from (
  values
    -- veterans (long history)
    ('a0000000-0000-4000-8000-000000000001'::uuid,
     'ရန်ကုန်နှင့် မန္တလေးရှိ အသေးစားလုပ်ငန်း ၄၀+ အတွက် လိုဂို၊ အမှတ်တံဆိပ် လမ်းညွှန်နှင့် ထုပ်ပိုးမှု အခြေခံ ပက်ကေ့ချ်များ ဖန်တီးပေးခဲ့သည်။ ကော်ဖီဆိုင်၊ လက်မှုပစ္စည်းနှင့် အလှကုန် အမှတ်တံဆိပ်များကို အထူးပြုသည်။',
     'Eight years designing logo systems, brand guides, and packaging starters for 40+ small businesses across Yangon and Mandalay. Cafe, craft, and beauty brands are a specialty.',
     interval '420 days', interval '500 days'),
    ('a0000000-0000-4000-8000-000000000005'::uuid,
     'အွန်လိုင်းစတိုးနှင့် Facebook စာမျက်နှာအတွက် ထုတ်ကုန်ပုံ ရာနှင့်ချီ ရိုက်ပြီးပါပြီ။ စတူဒီယိုနှင့် သဘာဝအလင်း နှစ်မျိုးလုံး လုပ်နိုင်သည်။',
     'Hundreds of catalogue shots for online shops and Facebook pages. Studio and natural light.',
     interval '380 days', interval '450 days'),
    ('a0000000-0000-4000-8000-000000000009'::uuid,
     'အသေးစားလုပ်ငန်း ဝက်ဘ်ဆိုက် ၃၀+ တည်ဆောက်ခဲ့သည်။ မြန်ဆန်သော static/landing နှင့် မိုဘိုင်း-ဦးစားပေး ဒီဇိုင်းကို အဓိကထားသည်။ ၃ဂျီ ကွန်ရက်ပေါ်မှာလည်း ဖွင့်လွယ်အောင် အလေးထားသည်။',
     'Built 30+ marketing sites for SMEs. Fast static/landing builds, mobile-first, tuned for slow 3G.',
     interval '360 days', interval '430 days'),
    ('a0000000-0000-4000-8000-00000000000d'::uuid,
     'လစဉ် ပို့စ်အစီအစဉ်၊ စာမျက်နှာ စီမံမှုနှင့် အခြေခံ ကြော်ငြာ စနစ်သတ်မှတ်မှု။ ကော်ဖီဆိုင်နှင့် လက်လီဆိုင် အတွေ့အကြုံ များသည်။',
     'Monthly calendars, page management, and light ads setup. Strong cafe and retail experience.',
     interval '300 days', interval '340 days'),
    ('a0000000-0000-4000-8000-000000000010'::uuid,
     'လုပ်ငန်း ဘလော့၊ ဆောင်းပါးနှင့် Facebook ရှည်လျားစာသားများကို မြန်မာလို ရေးသားသည်။ စာဖတ်သူနားလည်လွယ်အောင် တိုရှင်းစွာ ရေးသည်။',
     'Burmese blogs, articles, and long-form Facebook posts for small businesses. Clear and concise.',
     interval '240 days', interval '280 days'),
    ('a0000000-0000-4000-8000-000000000012'::uuid,
     'ဆိုင်နှင့် ထုတ်ကုန်အတွက် တိုတောင်းသော ဗီဒီယို ရာနှင့်ချီ ရိုက်ပြီး တည်းဖြတ်ခဲ့သည်။ ရန်ကုန်မြို့တွင်း ရိုက်ကွင်း သွားနိုင်သည်။',
     'Shot and edited hundreds of short-form clips for shops and products. On-location in Yangon.',
     interval '220 days', interval '260 days'),
    ('a0000000-0000-4000-8000-000000000014'::uuid,
     'လုပ်ငန်းစာ၊ ဝက်ဘ်စာသားနှင့် မီနူး ဘာသာပြန် အတွေ့အကြုံ များသည်။ သဘာဝကျသော မြန်မာစာကို အလေးထားသည်။',
     'Business docs, website copy, and menus — Myanmar ↔ English. Natural Burmese preferred over literal calques.',
     interval '200 days', interval '250 days'),
    ('a0000000-0000-4000-8000-000000000016'::uuid,
     'ကာတွန်းဇာတ်ကောင်၊ တည်းဖြတ်ပုံနှင့် ကမ်ပိန်း ပုံများကို ဒစ်ဂျစ်တယ်ဖြင့် ဆွဲသည်။ အမှတ်တံဆိပ်နှင့် ကိုက်ညီအောင် စတိုင် သတ်မှတ်ပေးနိုင်သည်။',
     'Digital characters, editorial art, and campaign illustrations. Can lock a style to match a brand.',
     interval '180 days', interval '210 days'),
    -- mid tenure
    ('a0000000-0000-4000-8000-000000000003'::uuid,
     'အစားအသောက်နှင့် လက်မှုပစ္စည်း ထုပ်ပိုးမှုကို ငါးနှစ်ကျော် လုပ်ကိုင်ခဲ့သည်။ ပရင့်အတွက် CMYK နှင့် ဒိုင်းဖတ် ဖိုင်များ အဆင်သင့် ပေးသည်။',
     'Five-plus years on food and handmade packaging. Delivers print-ready CMYK and die-line files.',
     interval '150 days', interval '180 days'),
    ('a0000000-0000-4000-8000-000000000018'::uuid,
     'မြန်မာ/အင်္ဂလိပ် ကြော်ငြာနှင့် landing page စာသား။ အသံအရောင် (brand voice) ကို ရှင်းလင်းစွာ ထိန်းသည်။',
     'Burmese/English ad and landing-page copy with a clear brand voice.',
     interval '120 days', interval '140 days'),
    ('a0000000-0000-4000-8000-00000000001a'::uuid,
     'ချိန်းဆိုမှု၊ အီးမေးလ် စီမံမှုနှင့် အစည်းအဝေး မှတ်စုများကို လစဉ် ကူညီပေးသည်။ အင်္ဂလိပ်/မြန်မာ နှစ်ဘာသာ။',
     'Monthly calendar, inbox, and meeting-note support. Burmese and English.',
     interval '100 days', interval '120 days'),
    -- newer / sparse
    ('a0000000-0000-4000-8000-000000000004'::uuid,
     'ကော်ဖီဆိုင် မီနူးနှင့် လက်ကမ်းစာရွက်များ စတင်လက်ခံနေသည်။',
     'Just starting — cafe menus and flyers.',
     interval '18 days', interval '25 days'),
    ('a0000000-0000-4000-8000-00000000000c'::uuid,
     'ရှိပြီးသားဆိုက် အသေးစား ပြင်ဆင်မှုများ လက်ခံသည်။',
     'Small site fixes — newer to the platform.',
     interval '14 days', interval '20 days'),
    ('a0000000-0000-4000-8000-00000000001e'::uuid,
     'ပလက်ဖောင်းသို့ မကြာသေးမီက ဝင်ရောက်သည်။ တိုတောင်းသော သတင်းပုံစံ စာသားများ လက်ခံသည်။',
     'Newer on the platform. Takes short news-style Burmese copy jobs.',
     interval '10 days', interval '12 days'),
    ('a0000000-0000-4000-8000-00000000001f'::uuid,
     'ဆိုင်ဖွင့်ပွဲနှင့် ပရိုမို တိုကလစ်များ စတင်လက်ခံသည်။',
     'Just starting — opening-day and promo clips.',
     interval '8 days', interval '11 days'),
    ('a0000000-0000-4000-8000-000000000020'::uuid,
     'အီးမေးလ်နှင့် စာတို တိုတောင်းသော ဘာသာပြန်များကို လက်ခံသည်။',
     'Newer translator — emails and short messages.',
     interval '7 days', interval '9 days'),
    ('a0000000-0000-4000-8000-000000000021'::uuid,
     'စတစ်ကာနှင့် ရိုးရှင်းသော အိုင်ကွန် စက်များ စတင်ဆွဲနေသည်။',
     'Newer illustrator — stickers and simple icon sets.',
     interval '6 days', interval '8 days'),
    ('a0000000-0000-4000-8000-000000000022'::uuid,
     'Facebook / Instagram ကက်ပရှင်း တိုများကို လက်ခံသည်။',
     'Newer copywriter — short social captions.',
     interval '5 days', interval '7 days'),
    ('a0000000-0000-4000-8000-000000000023'::uuid,
     'ဖိုင်စီစဉ်နှင့် စာရင်း အသေးစား အကူအညီ စတင်လက်ခံသည်။',
     'Newer VA — file sorting and simple lists.',
     interval '4 days', interval '6 days'),
    ('a0000000-0000-4000-8000-000000000024'::uuid,
     'ဈေးရက် ပေါ့ပ်အပ် ဆိုင်ခင်း အကြံပြုချက် စတင်ပေးသည်။',
     'Newer — weekend market pop-up booth layout tips.',
     interval '3 days', interval '5 days')
) as v(user_id, bio_my, bio_en, reviewed_ago, created_ago)
where professionals.user_id = v.user_id;

-- Keep client display names fresh on re-seed.
update profiles set display_name = v.display_name
from (
  values
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'ရွှေကော်ဖီ · Shwe Coffee'),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'မြန်မာလက်မှု · Myanmar Craft Co'),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'Green Bowl Kitchen'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'ပန်းသီး စတိုး · Apple Lane Shop'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'ယုဇန အလှကုန် · Yuzana Beauty'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'Riverbend Studio'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'မန္တလေးစာအုပ် · Mandalay Books'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'ထွန်းလင်း ကော်ဖီ · Tun Lin Cafe'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'Horizon Logistics'),
    ('b0000000-0000-4000-8000-00000000000a'::uuid, 'ပုလဲ အိမ် · Pearl Homestay'),
    ('b0000000-0000-4000-8000-00000000000b'::uuid, 'စိမ်းလန်း စျေး · Sein Lan Market'),
    ('b0000000-0000-4000-8000-00000000000c'::uuid, 'North Gate Apparel')
) as v(id, display_name)
where profiles.id = v.id;

-- ---------------------------------------------------------------- portfolio_items
-- Abstract SVG gradients (no stock photos, no brand marks). Wipe demo rows on re-seed.
-- Density varies: veterans 5–7, mid 2–3, sparse/newer 0–1 (omitted below).

delete from portfolio_items
 where professional_id::text like 'a0000000-%';

insert into portfolio_items (professional_id, external_url, caption, sort)
select v.professional_id, v.external_url, v.caption, v.sort
from (
  values
    -- RICH: Min Thet (graphic-design) — 7
    ('a0000000-0000-4000-8000-000000000001'::uuid, '/images/portfolio/01.svg', 'Cafe mark system — wordmark', 0),
    ('a0000000-0000-4000-8000-000000000001'::uuid, '/images/portfolio/02.svg', 'Cafe mark system — stamp', 1),
    ('a0000000-0000-4000-8000-000000000001'::uuid, '/images/portfolio/03.svg', 'Beauty brand kit — palette', 2),
    ('a0000000-0000-4000-8000-000000000001'::uuid, '/images/portfolio/04.svg', 'Beauty brand kit — label', 3),
    ('a0000000-0000-4000-8000-000000000001'::uuid, '/images/portfolio/05.svg', 'Craft co. packaging starter', 4),
    ('a0000000-0000-4000-8000-000000000001'::uuid, '/images/portfolio/06.svg', 'Seasonal poster set', 5),
    ('a0000000-0000-4000-8000-000000000001'::uuid, '/images/portfolio/07.svg', 'Social avatar lockups', 6),
    -- mid graphic
    ('a0000000-0000-4000-8000-000000000002'::uuid, '/images/portfolio/08.svg', 'Opening-day poster', 0),
    ('a0000000-0000-4000-8000-000000000002'::uuid, '/images/portfolio/09.svg', 'Festival colour block', 1),
    ('a0000000-0000-4000-8000-000000000003'::uuid, '/images/portfolio/10.svg', 'Snack pouch front', 0),
    ('a0000000-0000-4000-8000-000000000003'::uuid, '/images/portfolio/11.svg', 'Snack pouch back', 1),
    ('a0000000-0000-4000-8000-000000000003'::uuid, '/images/portfolio/12.svg', 'Jar label sheet', 2),
    ('a0000000-0000-4000-8000-000000000003'::uuid, '/images/portfolio/13.svg', 'Die-line study', 3),
    ('a0000000-0000-4000-8000-000000000003'::uuid, '/images/portfolio/14.svg', 'Shelf mockup wash', 4),
    -- sparse: Khine Zaw (newer graphic) — 1 only
    ('a0000000-0000-4000-8000-000000000004'::uuid, '/images/portfolio/15.svg', 'First menu draft', 0),
    -- RICH: Phyu Phyu (photography) — 6
    ('a0000000-0000-4000-8000-000000000005'::uuid, '/images/portfolio/16.svg', 'Skincare bottle set', 0),
    ('a0000000-0000-4000-8000-000000000005'::uuid, '/images/portfolio/17.svg', 'Skincare lifestyle', 1),
    ('a0000000-0000-4000-8000-000000000005'::uuid, '/images/portfolio/18.svg', 'Snack flat-lay', 2),
    ('a0000000-0000-4000-8000-000000000005'::uuid, '/images/portfolio/19.svg', 'Apparel hang-shot', 3),
    ('a0000000-0000-4000-8000-000000000005'::uuid, '/images/portfolio/20.svg', 'Detail crop — texture', 4),
    ('a0000000-0000-4000-8000-000000000005'::uuid, '/images/portfolio/21.svg', 'Catalogue grid sample', 5),
    ('a0000000-0000-4000-8000-000000000006'::uuid, '/images/portfolio/22.svg', 'Bowl steam shot', 0),
    ('a0000000-0000-4000-8000-000000000006'::uuid, '/images/portfolio/23.svg', 'Latte art close-up', 1),
    ('a0000000-0000-4000-8000-000000000006'::uuid, '/images/portfolio/24.svg', 'Menu hero plate', 2),
    ('a0000000-0000-4000-8000-000000000007'::uuid, '/images/portfolio/25.svg', 'Opening ribbon cut', 0),
    ('a0000000-0000-4000-8000-000000000007'::uuid, '/images/portfolio/26.svg', 'Workshop portrait', 1),
    ('a0000000-0000-4000-8000-000000000008'::uuid, '/images/portfolio/27.svg', 'Shopfront dusk', 0),
    ('a0000000-0000-4000-8000-000000000008'::uuid, '/images/portfolio/28.svg', 'Interior wide', 1),
    -- RICH: Win Htut (web) — 6
    ('a0000000-0000-4000-8000-000000000009'::uuid, '/images/portfolio/29.svg', 'Cafe marketing site — home', 0),
    ('a0000000-0000-4000-8000-000000000009'::uuid, '/images/portfolio/30.svg', 'Cafe marketing site — menu', 1),
    ('a0000000-0000-4000-8000-000000000009'::uuid, '/images/portfolio/31.svg', 'Logistics landing', 2),
    ('a0000000-0000-4000-8000-000000000009'::uuid, '/images/portfolio/32.svg', 'Homestay booking page', 3),
    ('a0000000-0000-4000-8000-000000000009'::uuid, '/images/portfolio/33.svg', 'Mobile nav study', 4),
    ('a0000000-0000-4000-8000-000000000009'::uuid, '/images/portfolio/34.svg', '3G-light asset set', 5),
    ('a0000000-0000-4000-8000-00000000000a'::uuid, '/images/portfolio/35.svg', 'Catalogue storefront', 0),
    ('a0000000-0000-4000-8000-00000000000a'::uuid, '/images/portfolio/36.svg', 'Order form flow', 1),
    ('a0000000-0000-4000-8000-00000000000a'::uuid, '/images/portfolio/37.svg', 'Product card UI', 2),
    ('a0000000-0000-4000-8000-00000000000b'::uuid, '/images/portfolio/38.svg', 'Campaign landing A', 0),
    ('a0000000-0000-4000-8000-00000000000b'::uuid, '/images/portfolio/39.svg', 'Campaign landing B', 1),
    ('a0000000-0000-4000-8000-00000000000b'::uuid, '/images/portfolio/40.svg', 'Lead form block', 2),
    -- sparse: May Thu (web fixes) — 1
    ('a0000000-0000-4000-8000-00000000000c'::uuid, '/images/portfolio/01.svg', 'Speed fix before/after', 0),
    -- RICH: Tun Lin (social) — 5
    ('a0000000-0000-4000-8000-00000000000d'::uuid, '/images/portfolio/02.svg', '30-day content grid', 0),
    ('a0000000-0000-4000-8000-00000000000d'::uuid, '/images/portfolio/03.svg', 'Cafe story frames', 1),
    ('a0000000-0000-4000-8000-00000000000d'::uuid, '/images/portfolio/04.svg', 'Retail promo carousel', 2),
    ('a0000000-0000-4000-8000-00000000000d'::uuid, '/images/portfolio/05.svg', 'Cover + avatar pair', 3),
    ('a0000000-0000-4000-8000-00000000000d'::uuid, '/images/portfolio/06.svg', 'Boost creative set', 4),
    ('a0000000-0000-4000-8000-00000000000e'::uuid, '/images/portfolio/07.svg', 'Caption pack sample', 0),
    ('a0000000-0000-4000-8000-00000000000e'::uuid, '/images/portfolio/08.svg', 'Bilingual post draft', 1),
    ('a0000000-0000-4000-8000-00000000000f'::uuid, '/images/portfolio/09.svg', 'Ad creative A', 0),
    ('a0000000-0000-4000-8000-00000000000f'::uuid, '/images/portfolio/10.svg', 'Ad creative B', 1),
    ('a0000000-0000-4000-8000-00000000000f'::uuid, '/images/portfolio/11.svg', 'Audience sketch', 2),
    -- content-writing: rich Myat Noe; sparse Zaw Min omitted; newer Eaint omitted
    ('a0000000-0000-4000-8000-000000000010'::uuid, '/images/portfolio/12.svg', 'Cafe origin story', 0),
    ('a0000000-0000-4000-8000-000000000010'::uuid, '/images/portfolio/13.svg', 'Product how-to series', 1),
    ('a0000000-0000-4000-8000-000000000010'::uuid, '/images/portfolio/14.svg', 'Festival announcement', 2),
    ('a0000000-0000-4000-8000-000000000010'::uuid, '/images/portfolio/15.svg', 'Founder interview edit', 3),
    ('a0000000-0000-4000-8000-000000000011'::uuid, '/images/portfolio/16.svg', 'Product blurb set', 0),
    -- video: rich Nanda; Ko Ko medium; Kyaw Swar sparse omitted
    ('a0000000-0000-4000-8000-000000000012'::uuid, '/images/portfolio/17.svg', 'Reel still — pour', 0),
    ('a0000000-0000-4000-8000-000000000012'::uuid, '/images/portfolio/18.svg', 'Reel still — shopfront', 1),
    ('a0000000-0000-4000-8000-000000000012'::uuid, '/images/portfolio/19.svg', 'Unboxing cut', 2),
    ('a0000000-0000-4000-8000-000000000012'::uuid, '/images/portfolio/20.svg', 'Opening-day montage', 3),
    ('a0000000-0000-4000-8000-000000000012'::uuid, '/images/portfolio/21.svg', 'Hook frame study', 4),
    ('a0000000-0000-4000-8000-000000000013'::uuid, '/images/portfolio/22.svg', 'Captioned edit board', 0),
    ('a0000000-0000-4000-8000-000000000013'::uuid, '/images/portfolio/23.svg', 'Transition pack', 1),
    -- translation: rich Thazin; Yan Naing mid; Myint Myat omitted
    ('a0000000-0000-4000-8000-000000000014'::uuid, '/images/portfolio/24.svg', 'Menu EN↔MY sample', 0),
    ('a0000000-0000-4000-8000-000000000014'::uuid, '/images/portfolio/25.svg', 'Website about page', 1),
    ('a0000000-0000-4000-8000-000000000014'::uuid, '/images/portfolio/26.svg', 'Policy short form', 2),
    ('a0000000-0000-4000-8000-000000000015'::uuid, '/images/portfolio/27.svg', 'Subtitle timing sheet', 0),
    ('a0000000-0000-4000-8000-000000000015'::uuid, '/images/portfolio/28.svg', 'Spoken script draft', 1),
    -- illustration: rich Khin Myo; Aye Chan mid; Nwe Oo omitted
    ('a0000000-0000-4000-8000-000000000016'::uuid, '/images/portfolio/29.svg', 'Mascot turnaround', 0),
    ('a0000000-0000-4000-8000-000000000016'::uuid, '/images/portfolio/30.svg', 'Editorial spot art', 1),
    ('a0000000-0000-4000-8000-000000000016'::uuid, '/images/portfolio/31.svg', 'Campaign banner art', 2),
    ('a0000000-0000-4000-8000-000000000016'::uuid, '/images/portfolio/32.svg', 'Sticker sheet', 3),
    ('a0000000-0000-4000-8000-000000000016'::uuid, '/images/portfolio/33.svg', 'Pattern tile', 4),
    ('a0000000-0000-4000-8000-000000000017'::uuid, '/images/portfolio/34.svg', 'Tea pack illustration', 0),
    ('a0000000-0000-4000-8000-000000000017'::uuid, '/images/portfolio/35.svg', 'Snack character', 1),
    -- copywriting: rich Min Khant; Su Myat mid; Soe Moe omitted
    ('a0000000-0000-4000-8000-000000000018'::uuid, '/images/portfolio/36.svg', 'Landing hero lines', 0),
    ('a0000000-0000-4000-8000-000000000018'::uuid, '/images/portfolio/37.svg', 'Ad angle board', 1),
    ('a0000000-0000-4000-8000-000000000018'::uuid, '/images/portfolio/38.svg', 'CTA variants', 2),
    ('a0000000-0000-4000-8000-000000000019'::uuid, '/images/portfolio/39.svg', 'Welcome email', 0),
    ('a0000000-0000-4000-8000-000000000019'::uuid, '/images/portfolio/40.svg', 'Promo sequence', 1),
    -- VA: Nay Marn mid; Phyu Zar sparse 1; Wutt Yee omitted
    ('a0000000-0000-4000-8000-00000000001a'::uuid, '/images/portfolio/01.svg', 'Weekly inbox triage note', 0),
    ('a0000000-0000-4000-8000-00000000001a'::uuid, '/images/portfolio/02.svg', 'Calendar block sample', 1),
    ('a0000000-0000-4000-8000-00000000001a'::uuid, '/images/portfolio/03.svg', 'Meeting notes template', 2),
    ('a0000000-0000-4000-8000-00000000001b'::uuid, '/images/portfolio/04.svg', 'Order log snippet', 0),
    -- other: Hein Thet mid; Shwe Yee sparse; Tin Maung omitted
    ('a0000000-0000-4000-8000-00000000001c'::uuid, '/images/portfolio/05.svg', 'Opening-day roster', 0),
    ('a0000000-0000-4000-8000-00000000001c'::uuid, '/images/portfolio/06.svg', 'Shift checklist', 1),
    ('a0000000-0000-4000-8000-00000000001d'::uuid, '/images/portfolio/07.svg', 'Digitize sample stitch', 0)
) as v(professional_id, external_url, caption, sort);

-- ---------------------------------------------------------------- work_links
-- Established pros only. Wipe demo rows on re-seed.

delete from work_links
 where professional_id::text like 'a0000000-%';

insert into work_links (professional_id, platform, url, label, sort, verified_at)
values
  ('a0000000-0000-4000-8000-000000000001', 'behance',  'https://www.behance.net/inyalink-demo-minthet',  'Brand work', 0, now() - interval '90 days'),
  ('a0000000-0000-4000-8000-000000000001', 'website',  'https://example.inyalink.local/minthet',          'Portfolio site', 1, now() - interval '90 days'),
  ('a0000000-0000-4000-8000-000000000005', 'instagram','https://www.instagram.com/inyalink.demo.phyuphyu', 'Product shots', 0, now() - interval '60 days'),
  ('a0000000-0000-4000-8000-000000000009', 'github',   'https://github.com/inyalink-demo/winhtut-sites',   'Site samples', 0, now() - interval '80 days'),
  ('a0000000-0000-4000-8000-000000000009', 'website',  'https://example.inyalink.local/winhtut',           'Live demos', 1, now() - interval '80 days'),
  ('a0000000-0000-4000-8000-00000000000d', 'facebook', 'https://www.facebook.com/inyalink.demo.tunlin',    'Page samples', 0, now() - interval '50 days'),
  ('a0000000-0000-4000-8000-00000000000d', 'instagram','https://www.instagram.com/inyalink.demo.tunlin',   'Grid archive', 1, now() - interval '50 days'),
  ('a0000000-0000-4000-8000-000000000012', 'instagram','https://www.instagram.com/inyalink.demo.nanda',    'Reels', 0, now() - interval '40 days'),
  ('a0000000-0000-4000-8000-000000000014', 'linkedin', 'https://www.linkedin.com/in/inyalink-demo-thazin', 'Translator', 0, now() - interval '35 days'),
  ('a0000000-0000-4000-8000-000000000016', 'dribbble', 'https://dribbble.com/inyalink-demo-khinmyo',       'Illustration', 0, now() - interval '30 days'),
  ('a0000000-0000-4000-8000-000000000018', 'website',  'https://example.inyalink.local/minkhant-copy',     'Copy samples', 0, now() - interval '25 days');

-- ---------------------------------------------------------------- briefs + engagements
-- Reputation history (c000… / e000…) + showcase briefs (d000… / e100…).
-- Timestamps spread ~6 months. Re-run safe: wipe prior demo rows first.

delete from engagements
 where id::text like 'e0000000-%'
    or id::text like 'e1000000-%'
    or brief_id::text like 'c0000000-%'
    or brief_id::text like 'd0000000-%';
delete from briefs
 where id::text like 'c0000000-%'
    or id::text like 'd0000000-%';

-- Reputation plan: varied completed_count + declined/cancelled/disputed.
-- Includes newer-vertical veterans so categories are not empty of history.
with plan(pro_n, status, n) as (
  values
    -- core veterans / mid
    (1,  'confirmed'::engagement_status, 8),
    (2,  'confirmed', 2),
    (3,  'confirmed', 5),
    (4,  'confirmed', 1),   -- newer graphic: thin history
    (5,  'confirmed', 7),
    (6,  'confirmed', 3),
    (7,  'confirmed', 4),
    (8,  'confirmed', 3),
    (9,  'confirmed', 9),
    (10, 'confirmed', 4),
    (11, 'confirmed', 3),
    (12, 'confirmed', 1),   -- newer web: thin history
    (13, 'confirmed', 6),
    (14, 'confirmed', 3),
    (15, 'confirmed', 4),
    -- newer verticals (hex 16–28 = 0x10–0x1c)
    (16, 'confirmed', 5),   -- content writing veteran
    (18, 'confirmed', 6),   -- video veteran
    (20, 'confirmed', 4),   -- translation veteran
    (21, 'confirmed', 2),   -- translation mid
    (22, 'confirmed', 5),   -- illustration veteran
    (24, 'confirmed', 3),   -- copywriting veteran
    (26, 'confirmed', 3),   -- VA veteran
    (28, 'confirmed', 2),   -- other event staffing
    -- disputed (in completion_rate denominator)
    (1,  'disputed', 1),
    (9,  'disputed', 1),
    (15, 'disputed', 1),
    (18, 'disputed', 1),
    -- declined / cancelled (not in rate denominator)
    (2,  'declined', 1),
    (4,  'declined', 1),
    (12, 'declined', 1),
    (16, 'declined', 1),
    (5,  'cancelled', 1),
    (11, 'cancelled', 1),
    (22, 'cancelled', 1)
),
expanded as (
  select
    row_number() over (order by p.pro_n, p.status, g)::int as seq,
    p.pro_n,
    p.status
  from plan p
  cross join lateral generate_series(1, p.n) as g
),
titled as (
  select
    e.*,
    -- ~2.7 days × seq spreads history across several months
    (now() - (e.seq * interval '2.7 days')) as done_at,
    (array[
      -- 1–4 graphic-design
      'graphic-design', 'graphic-design', 'graphic-design', 'graphic-design',
      -- 5–8 photography
      'photography', 'photography', 'photography', 'photography',
      -- 9–12 web-development
      'web-development', 'web-development', 'web-development', 'web-development',
      -- 13–15 social-media-marketing
      'social-media-marketing', 'social-media-marketing', 'social-media-marketing',
      -- 16–17 content-writing-burmese
      'content-writing-burmese', 'content-writing-burmese',
      -- 18–19 video-tiktok-content
      'video-tiktok-content', 'video-tiktok-content',
      -- 20–21 translation
      'translation', 'translation',
      -- 22–23 illustration
      'illustration', 'illustration',
      -- 24–25 copywriting
      'copywriting', 'copywriting',
      -- 26–27 virtual-assistant
      'virtual-assistant', 'virtual-assistant',
      -- 28–29 other
      'other', 'other'
    ])[e.pro_n] as cat_slug,
    (array[
      'ကော်ဖီဆိုင် လိုဂို', 'ဆိုင်ဖွင့်ပွဲ ပိုစတာ', 'ထုတ်ကုန် ထုပ်ပိုးမှု', 'မီနူး ဒီဇိုင်း',
      'ထုတ်ကုန် ဓာတ်ပုံ', 'အစားအသောက် ပုံများ', 'ပွဲတော် ဓာတ်ပုံ', 'ဆိုင်အတွင်းပိုင်း',
      'လုပ်ငန်း ဝက်ဘ်ဆိုက်', 'အွန်လိုင်းစတိုး', 'Landing page', 'ဆိုက် ပြင်ဆင်မှု',
      'လစဉ် ဆိုရှယ် စီမံမှု', 'ကက်ပရှင်း ရေးသားမှု', 'ကြော်ငြာ စနစ်သတ်မှတ်မှု',
      'ဘလော့ ဆောင်းပါး', 'ထုတ်ကုန် ဖော်ပြချက်',
      'TikTok ရိုက်ကူးမှု', 'Reel တည်းဖြတ်မှု',
      'စာရွက်စာတမ်း ဘာသာပြန်', 'စာတန်းထိုး',
      'ဒစ်ဂျစ်တယ် ပုံဆွဲ', 'ထုပ်ပိုးမှု ပုံ',
      'ကြော်ငြာ စာသား', 'အီးမေးလ် စီးရီး',
      'အင်ဘောက်စ် အကူ', 'အမှာစာ မှတ်တမ်း',
      'ပွဲ ဝန်ထမ်း စီစဉ်မှု', 'ယူနီဖောင်း ဒီဂျစ်တယ်'
    ])[e.pro_n] as title_base,
    (array[
      'ဆိုင်အမှတ်တံဆိပ်အတွက် လိုဂိုနှင့် အခြေခံ အသုံးပြုမှု လမ်းညွှန် လိုအပ်သည်။',
      'ဆိုင်ဖွင့်ပွဲအတွက် ပိုစတာနှင့် ဆိုရှယ် ပုံများ။',
      'အစားအသောက် ထုတ်ကုန်အတွက် ထုပ်ပိုးမှု ဒီဇိုင်း။',
      'ကော်ဖီဆိုင် မီနူး တစ်ခု ပရင့်အဆင်သင့်။',
      'အွန်လိုင်းရောင်းချမှုအတွက် ထုတ်ကုန်ပုံ စတူဒီယိုရိုက်ချက်။',
      'မီနူးနှင့် Facebook အတွက် အစားအသောက်ပုံများ။',
      'ဆိုင်ဖွင့်ပွဲနေ့ ဓာတ်ပုံနှင့် ပုံတူအချို့။',
      'ဆိုင်နှင့် ရုံး အတွင်းပိုင်း ဓာတ်ပုံ။',
      'လုပ်ငန်းမိတ်ဆက် ဝက်ဘ်ဆိုက် — မိုဘိုင်းဦးစားပေး။',
      'ကုန်ပစ္စည်းစာရင်းနှင့် အော်ဒါဖောင်ပါသော စတိုးအခြေခံ။',
      'ကမ်ပိန်းအတွက် landing page နှင့် ဖောင်။',
      'ရှိပြီးသားဆိုက် မြန်နှုန်းနှင့် ချွတ်ယွင်းချက် ပြင်ဆင်မှု။',
      'လစဉ် Facebook / Instagram ပို့စ်အစီအစဉ်။',
      'မြန်မာ/အင်္ဂလိပ် ကက်ပရှင်း ပက်ကေ့ချ်။',
      'အသေးစား ဘူစ့်/ကြော်ငြာ စနစ်သတ်မှတ်မှု။',
      'လုပ်ငန်း ဘလော့ ဆောင်းပါး နှစ်ပုဒ်။',
      'အွန်လိုင်းစတိုး ထုတ်ကုန် ဖော်ပြချက်များ။',
      'ထုတ်ကုန်အတွက် TikTok / Reels ရိုက်ကူးမှု။',
      'ရိုက်ပြီးသားကလစ်များကို Reel ပုံစံ တည်းဖြတ်ခြင်း။',
      'ဝက်ဘ်စာသား မြန်မာ ↔ အင်္ဂလိပ် ဘာသာပြန်။',
      'ဗီဒီယို စာတန်းထိုးနှင့် စကားပြောစာသား။',
      'ကမ်ပိန်းအတွက် ဒစ်ဂျစ်တယ် ပုံဆွဲ။',
      'အစားအသောက် ထုပ်ပိုးမှု လက်ရေးပုံ။',
      'Landing page နှင့် ကြော်ငြာ စာသား။',
      'ကမ်ပိန်း အီးမေးလ် စီးရီး။',
      'အပတ်စဉ် အင်ဘောက်စ်နှင့် ချိန်းဆိုမှု အကူ။',
      'အမှာစာ မှတ်တမ်းနှင့် အခြေခံ ဖောက်သည် စောင့်ရှောက်မှု။',
      'ဆိုင်ဖွင့်ပွဲနေ့ ဝန်ထမ်း စီစဉ်မှု။',
      'ယူနီဖောင်း လိုဂို ဒီဂျစ်တယ် ဖိုင်။'
    ])[e.pro_n] as description_base
  from expanded e
),
ins_briefs as (
  insert into briefs (
    id, client_id, status, source, language, category_id,
    title, description, budget_min_mmk, budget_max_mmk,
    created_at, updated_at
  )
  select
    ('c0000000-0000-4000-8000-' || lpad(to_hex(t.seq), 12, '0'))::uuid,
    ('b0000000-0000-4000-8000-' || lpad(to_hex(((t.seq - 1) % 12) + 1), 12, '0'))::uuid,
    case
      when t.status in ('confirmed', 'disputed') then 'closed'::brief_status
      when t.status = 'cancelled' then 'cancelled'::brief_status
      else 'matched'::brief_status
    end,
    'form'::brief_source,
    'my'::text_language,
    c.id,
    t.title_base || ' · ' || t.seq,
    t.description_base,
    80000 + ((t.seq % 5) * 40000),
    200000 + ((t.seq % 7) * 80000),
    t.done_at - interval '10 days',
    t.done_at
  from titled t
  join categories c on c.slug = t.cat_slug
  returning id
)
insert into engagements (
  id, brief_id, professional_id, status, amount_mmk, match_reason, decline_reason,
  proposed_at, accepted_at, delivered_at, confirmed_at, created_at, updated_at
)
select
  ('e0000000-0000-4000-8000-' || lpad(to_hex(t.seq), 12, '0'))::uuid,
  ('c0000000-0000-4000-8000-' || lpad(to_hex(t.seq), 12, '0'))::uuid,
  ('a0000000-0000-4000-8000-' || lpad(to_hex(t.pro_n), 12, '0'))::uuid,
  t.status,
  (100000 + (t.seq * 7500))::bigint,
  'Prior work fit for category and budget',
  case when t.status = 'declined' then 'အချိန်ဇယား မကိုက်ညီပါ' else null end,
  t.done_at - interval '14 days',
  case when t.status = 'declined' then null
       else t.done_at - interval '12 days' end,
  case when t.status in ('confirmed', 'disputed')
       then t.done_at - interval '2 days'
       else null end,
  case when t.status = 'confirmed' then t.done_at else null end,
  t.done_at - interval '14 days',
  t.done_at
from titled t;

-- ---------------------------------------------------------------- showcase briefs (10)
-- Open / matched / in progress / completed across categories. Fixed d000… / e100… IDs.

insert into briefs (
  id, client_id, status, source, language, category_id,
  title, description, requirements,
  budget_min_mmk, budget_max_mmk, deadline,
  matching_mode, interest_opens_at, interest_closes_at,
  created_at, updated_at
)
select
  s.id,
  s.client_id,
  s.status,
  s.source,
  s.language,
  c.id,
  s.title,
  s.description,
  s.requirements::jsonb,
  s.budget_min,
  s.budget_max,
  s.deadline,
  s.matching_mode,
  s.interest_opens_at,
  s.interest_closes_at,
  s.created_at,
  s.updated_at
from (
  values
    -- 1 submitted / open — graphic-design (demo client)
    ('d0000000-0000-4000-8000-000000000001'::uuid,
     'b0000000-0000-4000-8000-000000000001'::uuid,
     'submitted'::brief_status, 'ai_chat'::brief_source, 'my'::text_language,
     'graphic-design',
     'ကော်ဖီဆိုင် လိုဂိုနှင့် အမှတ်တံဆိပ်',
     'ရန်ကုန်ရှိ ကော်ဖီဆိုင်အသစ်အတွက် လိုဂို၊ စတာ့ပ်နှင့် ဆိုရှယ် အဗတာ လိုအပ်သည်။ ရိုးရှင်းပြီး မှတ်မိလွယ်သော ပုံစံကို လိုချင်သည်။',
     '["လိုဂို SVG/PNG","အရောင် ၂–၃ ရောင်","Instagram အဗတာ"]',
     150000::bigint, 350000::bigint, (current_date + 21),
     'open_pool'::text, now() - interval '1 day', now() + interval '2 days',
     now() - interval '2 days', now() - interval '1 day'),
    -- 2 submitted / open — photography
    ('d0000000-0000-4000-8000-000000000002'::uuid,
     'b0000000-0000-4000-8000-000000000005'::uuid,
     'submitted', 'form', 'my',
     'photography',
     'အလှကုန် ထုတ်ကုန် ဓာတ်ပုံ ၁၂ ပုံ',
     'Facebook စာမျက်နှာနှင့် စတိုးအတွက် ပုလင်း/ဘူး ထုတ်ကုန်ပုံများ။ နောက်ခံ ဖြူ၊ အလင်း တောက်ပစွာ။',
     '["စတူဒီယို ရိုက်ချက် ၁၂ ပုံ","retouch အပါအဝင်","web-ready JPG"]',
     180000, 400000, (current_date + 14),
     'open_pool', now() - interval '3 days', now() + interval '1 day',
     now() - interval '5 days', now() - interval '3 days'),
    -- 3 matched + proposed — web-development
    ('d0000000-0000-4000-8000-000000000003'::uuid,
     'b0000000-0000-4000-8000-000000000009'::uuid,
     'matched', 'form', 'en',
     'web-development',
     'Logistics company marketing site',
     'Simple three-page marketing site (Home, Services, Contact) with a lead form. Mobile-first; must load on slow 3G.',
     '["3 pages","lead form","mobile-first"]',
     500000, 900000, (current_date + 30),
     'open_pool', now() - interval '10 days', now() - interval '8 days',
     now() - interval '12 days', now() - interval '7 days'),
    -- 4 matched + accepted — social-media
    ('d0000000-0000-4000-8000-000000000004'::uuid,
     'b0000000-0000-4000-8000-000000000008'::uuid,
     'matched', 'form', 'my',
     'social-media-marketing',
     'ကော်ဖီဆိုင် လစဉ် ဆိုရှယ် စီမံမှု',
     'တစ်လစာ Facebook / Instagram ပို့စ် ၁၂ ခု၊ ကက်ပရှင်း မြန်မာလို၊ ကာဗာပုံ အသစ်။',
     '["ပို့စ် ၁၂","ကက်ပရှင်း မြန်မာ","ကာဗာပုံ"]',
     200000, 450000, (current_date + 28),
     'open_pool', now() - interval '18 days', now() - interval '16 days',
     now() - interval '20 days', now() - interval '14 days'),
    -- 5 matched + in_progress — content-writing
    ('d0000000-0000-4000-8000-000000000005'::uuid,
     'b0000000-0000-4000-8000-000000000002'::uuid,
     'matched', 'ai_chat', 'my',
     'content-writing-burmese',
     'လက်မှုပစ္စည်း ဆိုင် ဘလော့ ဆောင်းပါး ၃ ပုဒ်',
     'ထုတ်ကုန်နောက်ကွယ်မှ လက်မှုပညာရှင်များအကြောင်း မြန်မာစာ ဆောင်းပါးများ။ စာဖတ်သူနားလည်လွယ်အောင် ရေးပေးရန်။',
     '["ဆောင်းပါး ၃","ပုံခေါင်းစဉ်ပါ","၈၀၀–၁၂၀၀ စကားလုံး"]',
     90000, 220000, (current_date + 18),
     'open_pool', now() - interval '25 days', now() - interval '23 days',
     now() - interval '28 days', now() - interval '10 days'),
    -- 6 closed + confirmed — translation (~2 months ago)
    ('d0000000-0000-4000-8000-000000000006'::uuid,
     'b0000000-0000-4000-8000-000000000003'::uuid,
     'closed', 'form', 'en',
     'translation',
     'Restaurant menu Myanmar ↔ English',
     'Full menu translation both directions. Keep dish names natural in Burmese; avoid awkward calques.',
     '["full menu","MY↔EN","natural Burmese"]',
     70000, 150000, null,
     null, null, null,
     now() - interval '70 days', now() - interval '55 days'),
    -- 7 closed + confirmed — illustration (~3 months ago)
    ('d0000000-0000-4000-8000-000000000007'::uuid,
     'b0000000-0000-4000-8000-000000000004'::uuid,
     'closed', 'form', 'my',
     'illustration',
     'ဈေးရက် စတစ်ကာနှင့် ဇာတ်ကောင်ပုံ',
     'ပန်းသီး စတိုးအတွက် စတစ်ကာ စက်နှင့် ရိုးရှင်းသော ဇာတ်ကောင်ပုံ။',
     '["စတစ်ကာ ၆","ဇာတ်ကောင် ၁","PNG/SVG"]',
     150000, 320000, null,
     null, null, null,
     now() - interval '100 days', now() - interval '85 days'),
    -- 8 matched + delivered — video
    ('d0000000-0000-4000-8000-000000000008'::uuid,
     'b0000000-0000-4000-8000-00000000000b'::uuid,
     'matched', 'form', 'my',
     'video-tiktok-content',
     'ဈေးရက် ပရိုမို TikTok ၃ ကလစ်',
     'စိမ်းလန်း စျေးအတွက် ထုတ်ကုန်ပြ ကလစ်များ။ ရိုက်ကွင်း သွားရောက်ရိုက်ပြီး တည်းဖြတ်ပေးရန်။',
     '["ကလစ် ၃","၁၅–၃၀ စက္ကန့်","စာတန်းထိုး"]',
     120000, 280000, (current_date + 7),
     'open_pool', now() - interval '16 days', now() - interval '14 days',
     now() - interval '18 days', now() - interval '2 days'),
    -- 9 submitted / open — copywriting
    ('d0000000-0000-4000-8000-000000000009'::uuid,
     'b0000000-0000-4000-8000-00000000000c'::uuid,
     'submitted', 'form', 'en',
     'copywriting',
     'Apparel launch landing copy',
     'Headline, subhead, three benefit bullets, and CTA for a new tee drop. English primary; optional Burmese CTA line.',
     '["hero copy","3 benefits","CTA"]',
     90000, 200000, (current_date + 10),
     'open_pool', now() - interval '6 hours', now() + interval '3 days',
     now() - interval '1 day', now() - interval '6 hours'),
    -- 10 closed + confirmed — virtual-assistant (~4 months ago)
    ('d0000000-0000-4000-8000-00000000000a'::uuid,
     'b0000000-0000-4000-8000-000000000006'::uuid,
     'closed', 'form', 'en',
     'virtual-assistant',
     'Inbox and calendar support — one month',
     'Light weekly inbox triage and scheduling for a small studio. Burmese and English messages.',
     '["weekly triage","calendar blocks","bilingual"]',
     200000, 400000, null,
     null, null, null,
     now() - interval '130 days', now() - interval '100 days')
) as s(id, client_id, status, source, language, slug, title, description, requirements,
       budget_min, budget_max, deadline, matching_mode, interest_opens_at, interest_closes_at,
       created_at, updated_at)
join categories c on c.slug = s.slug;

insert into engagements (
  id, brief_id, professional_id, status, amount_mmk, match_reason,
  proposed_at, accepted_at, delivered_at, confirmed_at, created_at, updated_at
)
values
  -- 3 proposed (awaiting pro)
  ('e1000000-0000-4000-8000-000000000003',
   'd0000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000009',
   'proposed', 650000,
   'Strong portfolio of marketing sites; mobile-first fit',
   now() - interval '7 days', null, null, null,
   now() - interval '7 days', now() - interval '7 days'),
  -- 4 accepted → treat as early in-progress path
  ('e1000000-0000-4000-8000-000000000004',
   'd0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-00000000000d',
   'accepted', 320000,
   'Cafe social calendar experience',
   now() - interval '16 days', now() - interval '14 days', null, null,
   now() - interval '16 days', now() - interval '14 days'),
  -- 5 in_progress
  ('e1000000-0000-4000-8000-000000000005',
   'd0000000-0000-4000-8000-000000000005',
   'a0000000-0000-4000-8000-000000000010',
   'in_progress', 160000,
   'Burmese long-form samples matched brief tone',
   now() - interval '24 days', now() - interval '22 days', null, null,
   now() - interval '24 days', now() - interval '10 days'),
  -- 6 confirmed (completed)
  ('e1000000-0000-4000-8000-000000000006',
   'd0000000-0000-4000-8000-000000000006',
   'a0000000-0000-4000-8000-000000000014',
   'confirmed', 120000,
   'Natural Burmese menu translation',
   now() - interval '68 days', now() - interval '66 days',
   now() - interval '58 days', now() - interval '55 days',
   now() - interval '68 days', now() - interval '55 days'),
  -- 7 confirmed (completed)
  ('e1000000-0000-4000-8000-000000000007',
   'd0000000-0000-4000-8000-000000000007',
   'a0000000-0000-4000-8000-000000000016',
   'confirmed', 240000,
   'Character and sticker style fit',
   now() - interval '98 days', now() - interval '96 days',
   now() - interval '88 days', now() - interval '85 days',
   now() - interval '98 days', now() - interval '85 days'),
  -- 8 delivered (awaiting client confirm)
  ('e1000000-0000-4000-8000-000000000008',
   'd0000000-0000-4000-8000-000000000008',
   'a0000000-0000-4000-8000-000000000012',
   'delivered', 200000,
   'On-location short-form experience',
   now() - interval '15 days', now() - interval '13 days',
   now() - interval '2 days', null,
   now() - interval '15 days', now() - interval '2 days'),
  -- 10 confirmed (completed)
  ('e1000000-0000-4000-8000-00000000000a',
   'd0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-00000000001a',
   'confirmed', 280000,
   'Bilingual inbox support',
   now() - interval '128 days', now() - interval '126 days',
   now() - interval '105 days', now() - interval '100 days',
   now() - interval '128 days', now() - interval '100 days');

-- Light interest rows on open showcase briefs (DEMO_MODE also seeds at runtime).
insert into brief_interests (brief_id, professional_id, created_at)
values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', now() - interval '20 hours'),
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', now() - interval '18 hours'),
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', now() - interval '12 hours'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', now() - interval '2 days'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006', now() - interval '1 day'),
  ('d0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000018', now() - interval '4 hours'),
  ('d0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000019', now() - interval '3 hours')
on conflict do nothing;

-- Partner-tier: at least one per category for urgent / fallback demos.
update professionals set partner_tier = true
where user_id in (
  'a0000000-0000-4000-8000-000000000001'::uuid, -- graphic-design
  'a0000000-0000-4000-8000-000000000005'::uuid, -- photography
  'a0000000-0000-4000-8000-000000000009'::uuid, -- web-development
  'a0000000-0000-4000-8000-00000000000d'::uuid, -- social-media-marketing
  'a0000000-0000-4000-8000-000000000010'::uuid, -- content-writing-burmese
  'a0000000-0000-4000-8000-000000000012'::uuid, -- video-tiktok-content
  'a0000000-0000-4000-8000-000000000014'::uuid, -- translation
  'a0000000-0000-4000-8000-000000000016'::uuid, -- illustration
  'a0000000-0000-4000-8000-000000000018'::uuid, -- copywriting
  'a0000000-0000-4000-8000-00000000001a'::uuid, -- virtual-assistant
  'a0000000-0000-4000-8000-00000000001c'::uuid  -- other
);
