-- =============================================================================
-- THROWAWAY DEMO DATA — not for production.
-- Synthetic users, portfolios, and engagements for UI / reputation demos.
-- Safe to wipe. Do not treat as real customers or real work history.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING.
--
-- Counts: 11 categories, 29 professional profiles, 12 client profiles,
-- 29 approved professionals, ~2–4 portfolio_items each, ~50 confirmed
-- engagements with varied volume (1…10) plus declined/cancelled/disputed
-- so reputation rates are not uniformly 100%.
-- No identity documents or phones.
-- Avatars: local generated Southeast Asian portraits in apps/web/public/images/avatars/
--   (no NRC/selfie collection — demo faces only for UI fixtures).
-- Portfolio thumbnails: abstract SVG gradients in apps/web/public/images/portfolio/
--   (no stock photos, no brand logos).
--   category-relevant, 800×600 crop. Unsplash License.
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
  -- clients
  ('b0000000-0000-4000-8000-000000000001', 'client', 'Demo Client 01', 'my'),
  ('b0000000-0000-4000-8000-000000000002', 'client', 'Demo Client 02', 'my'),
  ('b0000000-0000-4000-8000-000000000003', 'client', 'Demo Client 03', 'en'),
  ('b0000000-0000-4000-8000-000000000004', 'client', 'Demo Client 04', 'my'),
  ('b0000000-0000-4000-8000-000000000005', 'client', 'Demo Client 05', 'my'),
  ('b0000000-0000-4000-8000-000000000006', 'client', 'Demo Client 06', 'en'),
  ('b0000000-0000-4000-8000-000000000007', 'client', 'Demo Client 07', 'my'),
  ('b0000000-0000-4000-8000-000000000008', 'client', 'Demo Client 08', 'my'),
  ('b0000000-0000-4000-8000-000000000009', 'client', 'Demo Client 09', 'en'),
  ('b0000000-0000-4000-8000-00000000000a', 'client', 'Demo Client 10', 'my'),
  ('b0000000-0000-4000-8000-00000000000b', 'client', 'Demo Client 11', 'my'),
  ('b0000000-0000-4000-8000-00000000000c', 'client', 'Demo Client 12', 'en'),
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
    -- graphic-design (4)
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'graphic-design',
     'လိုဂိုနှင့် ဘရန်းဒ် ဒီဇိုင်း', 'Logo and brand design',
     'စီးပွားရေးအတွက် ရိုးရှင်းသော လိုဂိုနှင့် အမှတ်တံဆိပ် စနစ်များ ဖန်တီးပေးပါသည်။',
     'I create simple logo systems and brand kits for small businesses.',
     array['logo','branding','packaging'], 5, 150000::bigint),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'graphic-design',
     'ပိုစတာနှင့် လူမှုမီဒီယာ ပုံများ', 'Posters and social graphics',
     'ပွဲတော်၊ ဆိုင်ဖွင့်ပွဲနှင့် ကမ်ပိန်းအတွက် ပုံများ ရေးဆွဲသည်။',
     'Campaign posters and social assets for openings and events.',
     array['poster','illustration','social-graphics'], 3, 80000::bigint),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'graphic-design',
     'ထုတ်ကုန်ထုပ်ပိုးမှု ဒီဇိုင်း', 'Product packaging design',
     'အစားအသောက်နှင့် လက်မှုပစ္စည်း ထုပ်ပိုးမှု ဒီဇိုင်း အတွေ့အကြုံရှိသည်။',
     'Packaging for food and handmade goods.',
     array['packaging','label','print'], 7, 200000::bigint),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'graphic-design',
     'မီနူးနှင့် ပရင့်ပစ္စည်း', 'Menus and print collateral',
     'ကော်ဖီဆိုင်၊ စားသောက်ဆိုင် မီနူးနှင့် လက်ကမ်းစာရွက်များ။',
     'Menus and flyers for cafes and restaurants.',
     array['menu','print','layout'], 4, 100000::bigint),
    -- photography (4)
    ('a0000000-0000-4000-8000-000000000005'::uuid, 'photography',
     'ထုတ်ကုန်ဓာတ်ပုံ', 'Product photography',
     'အွန်လိုင်းရောင်းချမှုအတွက် ထုတ်ကုန်ပုံများ ရိုက်ကူးသည်။',
     'Clean product shots for online catalogues.',
     array['product','studio','retouch'], 4, 120000::bigint),
    ('a0000000-0000-4000-8000-000000000006'::uuid, 'photography',
     'အစားအသောက် ဓာတ်ပုံ', 'Food photography',
     'မီနူးနှင့် ဆိုရှယ်အတွက် အစားအသောက်ပုံများ။',
     'Food photography for menus and social.',
     array['food','lifestyle','lighting'], 3, 100000::bigint),
    ('a0000000-0000-4000-8000-000000000007'::uuid, 'photography',
     'ပွဲနှင့် ပုံတူ ဓာတ်ပုံ', 'Event and portrait photography',
     'ဆိုင်ဖွင့်ပွဲ၊ အလုပ်ရုံပွဲနှင့် ပုံတူရိုက်ကူးမှု။',
     'Openings, workshops, and portraits.',
     array['event','portrait','editing'], 5, 180000::bigint),
    ('a0000000-0000-4000-8000-000000000008'::uuid, 'photography',
     'အဆောက်အအုံနှင့် အတွင်းပိုင်း', 'Architecture and interiors',
     'ဆိုင်နှင့် ရုံး အတွင်းပိုင်း ဓာတ်ပုံ။',
     'Interior and shopfront photography.',
     array['interior','architecture','hdr'], 6, 220000::bigint),
    -- web-development (4)
    ('a0000000-0000-4000-8000-000000000009'::uuid, 'web-development',
     'စီးပွားရေး ဝက်ဘ်ဆိုက်', 'Business websites',
     'အသေးစားလုပ်ငန်းအတွက် မြန်ဆန်သော ဝက်ဘ်ဆိုက်များ တည်ဆောက်သည်။',
     'Fast marketing sites for small businesses.',
     array['html','css','responsive'], 10, 500000::bigint),
    ('a0000000-0000-4000-8000-00000000000a'::uuid, 'web-development',
     'အွန်လိုင်းစတိုး အခြေခံ', 'Basic online stores',
     'ကုန်ပစ္စည်းစာရင်းနှင့် အော်ဒါလက်ခံသည့် စတိုးအခြေခံ။',
     'Simple storefronts with catalogue and orders.',
     array['ecommerce','shopify-like','forms'], 14, 800000::bigint),
    ('a0000000-0000-4000-8000-00000000000b'::uuid, 'web-development',
     'Landing page နှင့် ဖောင်', 'Landing pages and forms',
     'ကမ်ပိန်း landing page နှင့် ဖောင်ချိတ်ဆက်မှု။',
     'Campaign landing pages with lead forms.',
     array['landing','tailwind','forms'], 5, 250000::bigint),
    ('a0000000-0000-4000-8000-00000000000c'::uuid, 'web-development',
     'ဝက်ဘ် ပြုပြင်ထိန်းသိမ်းမှု', 'Site fixes and maintenance',
     'ရှိပြီးသားဆိုက် ပြင်ဆင်ခြင်းနှင့် မြန်နှုန်းမြှင့်တင်ခြင်း။',
     'Bugfixes and performance tune-ups.',
     array['wordpress','performance','bugfix'], 3, 80000::bigint),
    -- social-media-marketing (3)
    ('a0000000-0000-4000-8000-00000000000d'::uuid, 'social-media-marketing',
     'Facebook / Instagram စီမံခန့်ခွဲမှု', 'Facebook / Instagram management',
     'လစဉ် ပို့စ်အစီအစဉ်နှင့် စာမျက်နှာ စီမံမှု။',
     'Monthly content calendars and page management.',
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

-- New verticals (2 each) so browse/matching are not empty after category expansion.
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
    -- content-writing-burmese (2)
    ('a0000000-0000-4000-8000-000000000010'::uuid, 'content-writing-burmese', null::text,
     'မြန်မာ ဘလော့နှင့် ဆောင်းပါး', 'Burmese blogs and articles',
     'လုပ်ငန်းအတွက် မြန်မာစာ အကြောင်းအရာ ရေးသားပေးသည်။',
     'Burmese blog posts and long-form articles for small businesses.',
     array['articles','blog','editing'], 5, 80000::bigint),
    ('a0000000-0000-4000-8000-000000000011'::uuid, 'content-writing-burmese', null,
     'ထုတ်ကုန်စာမျက်နှာ စာသား', 'Product page copy in Burmese',
     'အွန်လိုင်းစတိုး ထုတ်ကုန် ဖော်ပြချက်များကို မြန်မာလို ရေးသည်။',
     'Clear Burmese product descriptions for online shops.',
     array['product-copy','scripts','blog'], 4, 60000::bigint),
    -- video-tiktok-content (2)
    ('a0000000-0000-4000-8000-000000000012'::uuid, 'video-tiktok-content', null,
     'TikTok / Reels ရိုက်ကူးခြင်း', 'TikTok and Reels production',
     'ဆိုင်နှင့် ထုတ်ကုန်အတွက် တိုတောင်းသော ဗီဒီယိုများ။',
     'Short-form TikTok and Reels for shops and products.',
     array['tiktok','reels','shooting'], 6, 120000::bigint),
    ('a0000000-0000-4000-8000-000000000013'::uuid, 'video-tiktok-content', null,
     'ဗီဒီယို တည်းဖြတ်ခြင်း', 'Short-form video editing',
     'ရိုက်ပြီးသား ကလစ်များကို TikTok ပုံစံ တည်းဖြတ်သည်။',
     'Edits raw clips into TikTok-ready posts.',
     array['editing','captions','reels'], 4, 90000::bigint),
    -- translation (2)
    ('a0000000-0000-4000-8000-000000000014'::uuid, 'translation', null,
     'မြန်မာ ↔ အင်္ဂလိပ် စာရွက်စာတမ်း', 'Myanmar ↔ English documents',
     'လုပ်ငန်းစာနှင့် ဝက်ဘ်စာသား ဘာသာပြန်။',
     'Business documents and website copy, Myanmar ↔ English.',
     array['my-en','en-my','documents'], 5, 70000::bigint),
    ('a0000000-0000-4000-8000-000000000015'::uuid, 'translation', null,
     'စာတန်းနှင့် ဗီဒီယို စာသား', 'Subtitles and video scripts',
     'ဗီဒီယို စာတန်းထိုးနှင့် စကားပြောစာသား ဘာသာပြန်။',
     'Subtitles and spoken-script translation.',
     array['subtitling','my-en','website'], 4, 65000::bigint),
    -- illustration (2)
    ('a0000000-0000-4000-8000-000000000016'::uuid, 'illustration', null,
     'ဒစ်ဂျစ်တယ် ပုံဆွဲ', 'Digital illustration',
     'ကာတွန်းနှင့် ထုတ်ကုန်အတွက် ဒစ်ဂျစ်တယ် ပုံများ။',
     'Digital illustrations for products and campaigns.',
     array['digital','character','editorial'], 7, 150000::bigint),
    ('a0000000-0000-4000-8000-000000000017'::uuid, 'illustration', null,
     'ထုပ်ပိုးမှု ပုံဆွဲ', 'Packaging illustration',
     'အစားအသောက် ထုပ်ပိုးမှုအတွက် လက်ရေးပုံများ။',
     'Hand-drawn style art for food packaging.',
     array['packaging','storyboard','digital'], 8, 180000::bigint),
    -- copywriting (2)
    ('a0000000-0000-4000-8000-000000000018'::uuid, 'copywriting', null,
     'ကြော်ငြာနှင့် landing စာသား', 'Ads and landing copy',
     'မြန်မာ/အင်္ဂလိပ် ကြော်ငြာနှင့် landing page စာသား။',
     'Burmese/English ad and landing-page copy.',
     array['ads','landing','brand-voice'], 4, 90000::bigint),
    ('a0000000-0000-4000-8000-000000000019'::uuid, 'copywriting', null,
     'အီးမေးလ်နှင့် ကမ်ပိန်း စာသား', 'Email and campaign copy',
     'ကမ်ပိန်း အီးမေးလ်နှင့် စီးရီး စာသားများ။',
     'Email sequences and campaign copy.',
     array['email','ads','my-en'], 5, 100000::bigint),
    -- virtual-assistant (2)
    ('a0000000-0000-4000-8000-00000000001a'::uuid, 'virtual-assistant', null,
     'အချိန်ဇယားနှင့် အင်ဘောက်စ်', 'Scheduling and inbox support',
     'ချိန်းဆိုမှုနှင့် အီးမေးလ် စီမံပေးသည်။',
     'Calendar and inbox management for small teams.',
     array['scheduling','inbox','research'], 3, 200000::bigint),
    ('a0000000-0000-4000-8000-00000000001b'::uuid, 'virtual-assistant', null,
     'ဒေတာနှင့် ဖောက်သည် စောင့်ရှောက်မှု', 'Data entry and light care',
     'အမှာစာ မှတ်တမ်းနှင့် အခြေခံ ဖောက်သည် စောင့်ရှောက်မှု။',
     'Order logs and light customer care.',
     array['data-entry','customer-care','inbox'], 4, 180000::bigint),
    -- other (2) — free-text specialty stored for ops
    ('a0000000-0000-4000-8000-00000000001c'::uuid, 'other',
     'Event staffing coordination for Yangon cafe openings',
     'ပွဲ စီစဉ်မှု အကူ', 'Event staffing coordination',
     'ဆိုင်ဖွင့်ပွဲအတွက် ဝန်ထမ်း စီစဉ်ပေးသည်။',
     'Coordinates day-of staffing for cafe and shop openings.',
     array['general','custom'], 6, 150000::bigint),
    ('a0000000-0000-4000-8000-00000000001d'::uuid, 'other',
     'Custom embroidery digitizing for uniforms',
     'အထည်အလိပ် ဒီဂျစ်တယ်ပုံ', 'Embroidery digitizing',
     'ယူနီဖောင်းအတွက် အထည်အလိပ် ဒီဇိုင်း ဒီဂျစ်တယ်လုပ်သည်။',
     'Digitizes logo artwork for uniform embroidery machines.',
     array['custom','multi-skill'], 5, 110000::bigint)
) as p(user_id, slug, category_other_text, headline_my, headline_en, bio_my, bio_en, skills, turnaround, min_budget)
join categories c on c.slug = p.slug
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------- portfolio_items
-- Abstract SVG gradients (no stock photos, no brand marks). Wipe demo rows on re-seed.

delete from portfolio_items
 where professional_id::text like 'a0000000-%';

insert into portfolio_items (professional_id, external_url, caption, sort)
select v.professional_id, v.external_url, v.caption, v.sort
from (
  values
    -- graphic-design / branding
    ('a0000000-0000-4000-8000-000000000001'::uuid, '/images/portfolio/01.svg', 'Abstract mark study A', 0),
    ('a0000000-0000-4000-8000-000000000001'::uuid, '/images/portfolio/02.svg', 'Abstract mark study B', 1),
    ('a0000000-0000-4000-8000-000000000001'::uuid, '/images/portfolio/03.svg', 'Abstract mark study C', 2),
    ('a0000000-0000-4000-8000-000000000002'::uuid, '/images/portfolio/04.svg', 'Poster colour block A', 0),
    ('a0000000-0000-4000-8000-000000000002'::uuid, '/images/portfolio/05.svg', 'Poster colour block B', 1),
    ('a0000000-0000-4000-8000-000000000003'::uuid, '/images/portfolio/06.svg', 'Packaging field A', 0),
    ('a0000000-0000-4000-8000-000000000003'::uuid, '/images/portfolio/07.svg', 'Packaging field B', 1),
    ('a0000000-0000-4000-8000-000000000003'::uuid, '/images/portfolio/08.svg', 'Packaging field C', 2),
    ('a0000000-0000-4000-8000-000000000003'::uuid, '/images/portfolio/09.svg', 'Packaging field D', 3),
    ('a0000000-0000-4000-8000-000000000004'::uuid, '/images/portfolio/10.svg', 'Print layout A', 0),
    ('a0000000-0000-4000-8000-000000000004'::uuid, '/images/portfolio/11.svg', 'Print layout B', 1),
    -- photography
    ('a0000000-0000-4000-8000-000000000005'::uuid, '/images/portfolio/12.svg', 'Studio wash A', 0),
    ('a0000000-0000-4000-8000-000000000005'::uuid, '/images/portfolio/13.svg', 'Studio wash B', 1),
    ('a0000000-0000-4000-8000-000000000005'::uuid, '/images/portfolio/14.svg', 'Studio wash C', 2),
    ('a0000000-0000-4000-8000-000000000006'::uuid, '/images/portfolio/15.svg', 'Food colour study A', 0),
    ('a0000000-0000-4000-8000-000000000006'::uuid, '/images/portfolio/16.svg', 'Food colour study B', 1),
    ('a0000000-0000-4000-8000-000000000007'::uuid, '/images/portfolio/17.svg', 'Event light study A', 0),
    ('a0000000-0000-4000-8000-000000000007'::uuid, '/images/portfolio/18.svg', 'Event light study B', 1),
    ('a0000000-0000-4000-8000-000000000007'::uuid, '/images/portfolio/19.svg', 'Event light study C', 2),
    ('a0000000-0000-4000-8000-000000000008'::uuid, '/images/portfolio/20.svg', 'Interior tone A', 0),
    ('a0000000-0000-4000-8000-000000000008'::uuid, '/images/portfolio/21.svg', 'Interior tone B', 1),
    -- web-development
    ('a0000000-0000-4000-8000-000000000009'::uuid, '/images/portfolio/22.svg', 'UI surface A', 0),
    ('a0000000-0000-4000-8000-000000000009'::uuid, '/images/portfolio/23.svg', 'UI surface B', 1),
    ('a0000000-0000-4000-8000-000000000009'::uuid, '/images/portfolio/24.svg', 'UI surface C', 2),
    ('a0000000-0000-4000-8000-00000000000a'::uuid, '/images/portfolio/25.svg', 'Storefront mosaic A', 0),
    ('a0000000-0000-4000-8000-00000000000a'::uuid, '/images/portfolio/26.svg', 'Storefront mosaic B', 1),
    ('a0000000-0000-4000-8000-00000000000b'::uuid, '/images/portfolio/27.svg', 'Landing block A', 0),
    ('a0000000-0000-4000-8000-00000000000b'::uuid, '/images/portfolio/28.svg', 'Landing block B', 1),
    ('a0000000-0000-4000-8000-00000000000b'::uuid, '/images/portfolio/29.svg', 'Landing block C', 2),
    ('a0000000-0000-4000-8000-00000000000b'::uuid, '/images/portfolio/30.svg', 'Landing block D', 3),
    ('a0000000-0000-4000-8000-00000000000c'::uuid, '/images/portfolio/31.svg', 'Perf chart wash A', 0),
    ('a0000000-0000-4000-8000-00000000000c'::uuid, '/images/portfolio/32.svg', 'Perf chart wash B', 1),
    -- social-media-marketing
    ('a0000000-0000-4000-8000-00000000000d'::uuid, '/images/portfolio/33.svg', 'Content grid A', 0),
    ('a0000000-0000-4000-8000-00000000000d'::uuid, '/images/portfolio/34.svg', 'Content grid B', 1),
    ('a0000000-0000-4000-8000-00000000000d'::uuid, '/images/portfolio/35.svg', 'Content grid C', 2),
    ('a0000000-0000-4000-8000-00000000000e'::uuid, '/images/portfolio/36.svg', 'Caption palette A', 0),
    ('a0000000-0000-4000-8000-00000000000e'::uuid, '/images/portfolio/37.svg', 'Caption palette B', 1),
    ('a0000000-0000-4000-8000-00000000000f'::uuid, '/images/portfolio/38.svg', 'Campaign wash A', 0),
    ('a0000000-0000-4000-8000-00000000000f'::uuid, '/images/portfolio/39.svg', 'Campaign wash B', 1),
    ('a0000000-0000-4000-8000-00000000000f'::uuid, '/images/portfolio/40.svg', 'Campaign wash C', 2),
    -- content-writing-burmese
    ('a0000000-0000-4000-8000-000000000010'::uuid, '/images/portfolio/01.svg', 'Article sample A', 0),
    ('a0000000-0000-4000-8000-000000000010'::uuid, '/images/portfolio/02.svg', 'Article sample B', 1),
    ('a0000000-0000-4000-8000-000000000011'::uuid, '/images/portfolio/03.svg', 'Product copy sample', 0),
    ('a0000000-0000-4000-8000-000000000011'::uuid, '/images/portfolio/04.svg', 'Script sample', 1),
    -- video-tiktok-content
    ('a0000000-0000-4000-8000-000000000012'::uuid, '/images/portfolio/05.svg', 'Reel still A', 0),
    ('a0000000-0000-4000-8000-000000000012'::uuid, '/images/portfolio/06.svg', 'Reel still B', 1),
    ('a0000000-0000-4000-8000-000000000013'::uuid, '/images/portfolio/07.svg', 'Edit board A', 0),
    ('a0000000-0000-4000-8000-000000000013'::uuid, '/images/portfolio/08.svg', 'Edit board B', 1),
    -- translation
    ('a0000000-0000-4000-8000-000000000014'::uuid, '/images/portfolio/09.svg', 'Doc sample A', 0),
    ('a0000000-0000-4000-8000-000000000014'::uuid, '/images/portfolio/10.svg', 'Doc sample B', 1),
    ('a0000000-0000-4000-8000-000000000015'::uuid, '/images/portfolio/11.svg', 'Subtitle sample', 0),
    ('a0000000-0000-4000-8000-000000000015'::uuid, '/images/portfolio/12.svg', 'Script sample', 1),
    -- illustration
    ('a0000000-0000-4000-8000-000000000016'::uuid, '/images/portfolio/13.svg', 'Character study A', 0),
    ('a0000000-0000-4000-8000-000000000016'::uuid, '/images/portfolio/14.svg', 'Character study B', 1),
    ('a0000000-0000-4000-8000-000000000017'::uuid, '/images/portfolio/15.svg', 'Pack art A', 0),
    ('a0000000-0000-4000-8000-000000000017'::uuid, '/images/portfolio/16.svg', 'Pack art B', 1),
    -- copywriting
    ('a0000000-0000-4000-8000-000000000018'::uuid, '/images/portfolio/17.svg', 'Ad copy A', 0),
    ('a0000000-0000-4000-8000-000000000018'::uuid, '/images/portfolio/18.svg', 'Ad copy B', 1),
    ('a0000000-0000-4000-8000-000000000019'::uuid, '/images/portfolio/19.svg', 'Email series A', 0),
    ('a0000000-0000-4000-8000-000000000019'::uuid, '/images/portfolio/20.svg', 'Email series B', 1),
    -- virtual-assistant
    ('a0000000-0000-4000-8000-00000000001a'::uuid, '/images/portfolio/21.svg', 'Workflow note A', 0),
    ('a0000000-0000-4000-8000-00000000001a'::uuid, '/images/portfolio/22.svg', 'Workflow note B', 1),
    ('a0000000-0000-4000-8000-00000000001b'::uuid, '/images/portfolio/23.svg', 'Care log A', 0),
    ('a0000000-0000-4000-8000-00000000001b'::uuid, '/images/portfolio/24.svg', 'Care log B', 1),
    -- other
    ('a0000000-0000-4000-8000-00000000001c'::uuid, '/images/portfolio/25.svg', 'Event plan A', 0),
    ('a0000000-0000-4000-8000-00000000001c'::uuid, '/images/portfolio/26.svg', 'Event plan B', 1),
    ('a0000000-0000-4000-8000-00000000001d'::uuid, '/images/portfolio/27.svg', 'Digitize sample A', 0),
    ('a0000000-0000-4000-8000-00000000001d'::uuid, '/images/portfolio/28.svg', 'Digitize sample B', 1)
) as v(professional_id, external_url, caption, sort);

-- ---------------------------------------------------------------- briefs + engagements
-- Varied completed_count (1 … ~10) and mix of declined / cancelled / disputed
-- so completion_rate_pct lands ~80–100% (view denominator excludes declined/cancelled).
-- Re-run safe: wipe prior demo briefs/engagements first.

delete from engagements
 where id::text like 'e0000000-%'
    or brief_id::text like 'c0000000-%';
delete from briefs where id::text like 'c0000000-%';

with plan(pro_n, status, n) as (
  values
    (1,  'confirmed'::engagement_status, 1),
    (2,  'confirmed', 1),
    (3,  'confirmed', 2),
    (4,  'confirmed', 2),
    (5,  'confirmed', 2),
    (6,  'confirmed', 3),
    (7,  'confirmed', 3),
    (8,  'confirmed', 4),
    (9,  'confirmed', 4),
    (10, 'confirmed', 4),
    (11, 'confirmed', 2),
    (12, 'confirmed', 1),
    (13, 'confirmed', 3),
    (14, 'confirmed', 8),
    (15, 'confirmed', 10),
    -- disputed is in completion_rate denominator -> ~80-90% for some pros
    (8,  'disputed', 1),
    (9,  'disputed', 1),
    (10, 'disputed', 1),
    (14, 'disputed', 1),
    (15, 'disputed', 2),
    -- declined / cancelled (realism + declined_count; not in rate denominator)
    (2,  'declined', 1),
    (4,  'declined', 1),
    (7,  'declined', 1),
    (14, 'declined', 1),
    (15, 'declined', 1),
    (5,  'cancelled', 1),
    (11, 'cancelled', 1),
    (15, 'cancelled', 1)
),
expanded as (
  select
    row_number() over (order by p.pro_n, p.status, g)::int as seq,
    p.pro_n,
    p.status
  from plan p
  cross join lateral generate_series(1, p.n) as g
),
ins_briefs as (
  insert into briefs (
    id, client_id, status, source, language, category_id,
    title, description, budget_min_mmk, budget_max_mmk,
    created_at, updated_at
  )
  select
    ('c0000000-0000-4000-8000-' || lpad(to_hex(e.seq), 12, '0'))::uuid,
    ('b0000000-0000-4000-8000-' || lpad(to_hex(((e.seq - 1) % 12) + 1), 12, '0'))::uuid,
    case
      when e.status in ('confirmed', 'disputed') then 'closed'::brief_status
      when e.status = 'cancelled' then 'cancelled'::brief_status
      else 'matched'::brief_status
    end,
    'form'::brief_source,
    'my'::text_language,
    c.id,
    'Demo brief ' || e.seq,
    'Throwaway demo brief for reputation seeding.',
    100000,
    500000,
    now() - (e.seq * interval '3.5 days'),
    now() - (e.seq * interval '3.5 days')
  from expanded e
  cross join lateral (
    select id from categories
    where slug = (array[
      'graphic-design', 'photography', 'web-development', 'social-media-marketing'
    ])[((e.pro_n - 1) % 4) + 1]
  ) c
  returning id
)
insert into engagements (
  id, brief_id, professional_id, status, amount_mmk, match_reason, decline_reason,
  proposed_at, accepted_at, delivered_at, confirmed_at, created_at, updated_at
)
select
  ('e0000000-0000-4000-8000-' || lpad(to_hex(e.seq), 12, '0'))::uuid,
  ('c0000000-0000-4000-8000-' || lpad(to_hex(e.seq), 12, '0'))::uuid,
  ('a0000000-0000-4000-8000-' || lpad(to_hex(e.pro_n), 12, '0'))::uuid,
  e.status,
  (120000 + (e.seq * 8000))::bigint,
  'demo seed match',
  case when e.status = 'declined' then 'demo: schedule conflict' else null end,
  now() - (e.seq * interval '3.5 days') - interval '7 days',
  case when e.status = 'declined' then null
       else now() - (e.seq * interval '3.5 days') - interval '5 days' end,
  case when e.status in ('confirmed', 'disputed')
       then now() - (e.seq * interval '3.5 days') - interval '1 day'
       else null end,
  case when e.status = 'confirmed'
       then now() - (e.seq * interval '3.5 days')
       else null end,
  now() - (e.seq * interval '3.5 days') - interval '7 days',
  now() - (e.seq * interval '3.5 days')
from expanded e;

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
