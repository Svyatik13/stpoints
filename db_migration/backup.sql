--
-- PostgreSQL database dump
--

\restrict z6G9M8ElbUY5kiyifY3sT4l5cL5WmA49Zbr6fImaf6Xeob7KMxEsIFees2RAqhq

-- Dumped from database version 15.16 (Debian 15.16-0+deb12u1)
-- Dumped by pg_dump version 15.16 (Debian 15.16-0+deb12u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: stpoints
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO stpoints;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: stpoints
--

COMMENT ON SCHEMA public IS '';


--
-- Name: CaseItemType; Type: TYPE; Schema: public; Owner: stpoints
--

CREATE TYPE public."CaseItemType" AS ENUM (
    'ST_REWARD',
    'MYTHIC_PASS'
);


ALTER TYPE public."CaseItemType" OWNER TO stpoints;

--
-- Name: ChallengeStatus; Type: TYPE; Schema: public; Owner: stpoints
--

CREATE TYPE public."ChallengeStatus" AS ENUM (
    'PENDING',
    'SOLVED',
    'EXPIRED',
    'INVALID'
);


ALTER TYPE public."ChallengeStatus" OWNER TO stpoints;

--
-- Name: Distribution; Type: TYPE; Schema: public; Owner: stpoints
--

CREATE TYPE public."Distribution" AS ENUM (
    'EQUAL',
    'WEIGHTED'
);


ALTER TYPE public."Distribution" OWNER TO stpoints;

--
-- Name: GiveawayStatus; Type: TYPE; Schema: public; Owner: stpoints
--

CREATE TYPE public."GiveawayStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."GiveawayStatus" OWNER TO stpoints;

--
-- Name: ListingStatus; Type: TYPE; Schema: public; Owner: stpoints
--

CREATE TYPE public."ListingStatus" AS ENUM (
    'ACTIVE',
    'SOLD',
    'CANCELLED'
);


ALTER TYPE public."ListingStatus" OWNER TO stpoints;

--
-- Name: ListingType; Type: TYPE; Schema: public; Owner: stpoints
--

CREATE TYPE public."ListingType" AS ENUM (
    'MYTHIC_PASS',
    'USERNAME'
);


ALTER TYPE public."ListingType" OWNER TO stpoints;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: stpoints
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO stpoints;

--
-- Name: TeacherRarity; Type: TYPE; Schema: public; Owner: stpoints
--

CREATE TYPE public."TeacherRarity" AS ENUM (
    'COMMON',
    'RARE',
    'EPIC',
    'LEGENDARY',
    'MYTHIC'
);


ALTER TYPE public."TeacherRarity" OWNER TO stpoints;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: stpoints
--

CREATE TYPE public."TransactionType" AS ENUM (
    'MINING_REWARD',
    'GIVEAWAY',
    'ADMIN_GRANT',
    'TRANSFER',
    'SYSTEM_DEBIT',
    'ST_ROOM_ACCESS',
    'CASE_OPENING',
    'MARKET_SALE',
    'MARKET_PURCHASE',
    'HANDLE_CREATE',
    'REFERRAL_REWARD',
    'VAULT_LOCK',
    'VAULT_UNLOCK',
    'AUCTION_REFUND',
    'TIP'
);


ALTER TYPE public."TransactionType" OWNER TO stpoints;

--
-- Name: VaultStakeStatus; Type: TYPE; Schema: public; Owner: stpoints
--

CREATE TYPE public."VaultStakeStatus" AS ENUM (
    'ACTIVE',
    'UNLOCKED'
);


ALTER TYPE public."VaultStakeStatus" OWNER TO stpoints;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.achievements (
    id text NOT NULL,
    type text NOT NULL,
    label text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    rarity text DEFAULT 'COMMON'::text NOT NULL
);


ALTER TABLE public.achievements OWNER TO stpoints;

--
-- Name: activity_events; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.activity_events (
    id text NOT NULL,
    type text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.activity_events OWNER TO stpoints;

--
-- Name: case_items; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.case_items (
    id text NOT NULL,
    case_id text NOT NULL,
    type public."CaseItemType" NOT NULL,
    label text NOT NULL,
    amount numeric(18,6),
    weight integer NOT NULL
);


ALTER TABLE public.case_items OWNER TO stpoints;

--
-- Name: case_openings; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.case_openings (
    id text NOT NULL,
    user_id text NOT NULL,
    case_id text NOT NULL,
    item_id text NOT NULL,
    cost_paid numeric(18,6) NOT NULL,
    reward_amount numeric(18,6),
    reward_type text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.case_openings OWNER TO stpoints;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.cases (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(18,6) DEFAULT 0 NOT NULL,
    is_daily boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.cases OWNER TO stpoints;

--
-- Name: giveaway_entries; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.giveaway_entries (
    id text NOT NULL,
    giveaway_id text NOT NULL,
    user_id text NOT NULL,
    joined_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.giveaway_entries OWNER TO stpoints;

--
-- Name: giveaway_winners; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.giveaway_winners (
    id text NOT NULL,
    giveaway_id text NOT NULL,
    user_id text NOT NULL,
    place integer NOT NULL,
    amount numeric(18,6) NOT NULL
);


ALTER TABLE public.giveaway_winners OWNER TO stpoints;

--
-- Name: giveaways; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.giveaways (
    id text NOT NULL,
    title text NOT NULL,
    "prizePool" numeric(18,6) NOT NULL,
    winner_count integer NOT NULL,
    distribution public."Distribution" DEFAULT 'EQUAL'::public."Distribution" NOT NULL,
    status public."GiveawayStatus" DEFAULT 'ACTIVE'::public."GiveawayStatus" NOT NULL,
    created_by text NOT NULL,
    ends_at timestamp(3) without time zone NOT NULL,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.giveaways OWNER TO stpoints;

--
-- Name: market_bids; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.market_bids (
    id text NOT NULL,
    listing_id text NOT NULL,
    bidder_id text NOT NULL,
    amount numeric(18,6) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.market_bids OWNER TO stpoints;

--
-- Name: market_listings; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.market_listings (
    id text NOT NULL,
    type public."ListingType" NOT NULL,
    price numeric(18,6) NOT NULL,
    status public."ListingStatus" DEFAULT 'ACTIVE'::public."ListingStatus" NOT NULL,
    seller_id text NOT NULL,
    pass_id text,
    username_id text,
    buyer_id text,
    sold_at timestamp(3) without time zone,
    st_due_at timestamp(3) without time zone,
    st_paid_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    current_highest_bid numeric(18,6),
    ends_at timestamp(3) without time zone,
    is_auction boolean DEFAULT false NOT NULL,
    min_increment numeric(18,6),
    starting_price numeric(18,6)
);


ALTER TABLE public.market_listings OWNER TO stpoints;

--
-- Name: mining_challenges; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.mining_challenges (
    id text NOT NULL,
    user_id text NOT NULL,
    prefix text NOT NULL,
    difficulty integer NOT NULL,
    target text NOT NULL,
    status public."ChallengeStatus" DEFAULT 'PENDING'::public."ChallengeStatus" NOT NULL,
    nonce bigint,
    result_hash text,
    hashes_computed integer,
    reward numeric(18,6),
    issued_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    solved_at timestamp(3) without time zone
);


ALTER TABLE public.mining_challenges OWNER TO stpoints;

--
-- Name: pass_code_logs; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.pass_code_logs (
    id text NOT NULL,
    code text NOT NULL,
    type text NOT NULL,
    used_by text,
    user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.pass_code_logs OWNER TO stpoints;

--
-- Name: stroom_sessions; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.stroom_sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    teacher_id text NOT NULL,
    cost numeric(18,6) NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.stroom_sessions OWNER TO stpoints;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_settings OWNER TO stpoints;

--
-- Name: teachers; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.teachers (
    id text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    rarity public."TeacherRarity" DEFAULT 'COMMON'::public."TeacherRarity" NOT NULL
);


ALTER TABLE public.teachers OWNER TO stpoints;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.transactions (
    id text NOT NULL,
    type public."TransactionType" NOT NULL,
    amount numeric(18,6) NOT NULL,
    description text,
    sender_id text,
    receiver_id text NOT NULL,
    balance_before numeric(18,6) NOT NULL,
    balance_after numeric(18,6) NOT NULL,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.transactions OWNER TO stpoints;

--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.user_achievements (
    id text NOT NULL,
    user_id text NOT NULL,
    achievement_id text NOT NULL,
    earned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_achievements OWNER TO stpoints;

--
-- Name: user_passes; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.user_passes (
    id text NOT NULL,
    user_id text NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    used_at timestamp(3) without time zone,
    obtained_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_passes OWNER TO stpoints;

--
-- Name: usernames; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.usernames (
    id text NOT NULL,
    handle text NOT NULL,
    owner_id text NOT NULL,
    can_sell_at timestamp(3) without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usernames OWNER TO stpoints;

--
-- Name: users; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.users (
    id text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    balance numeric(18,6) DEFAULT 0 NOT NULL,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_active_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    mining_started_at timestamp(3) without time zone,
    referral_count integer DEFAULT 0 NOT NULL,
    referrer_id text,
    wallet_address text,
    referral_clicks integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.users OWNER TO stpoints;

--
-- Name: vault_stakes; Type: TABLE; Schema: public; Owner: stpoints
--

CREATE TABLE public.vault_stakes (
    id text NOT NULL,
    user_id text NOT NULL,
    amount numeric(18,6) NOT NULL,
    apy numeric(5,2) NOT NULL,
    expected_yield numeric(18,6) NOT NULL,
    status public."VaultStakeStatus" DEFAULT 'ACTIVE'::public."VaultStakeStatus" NOT NULL,
    locked_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    unlocks_at timestamp(3) without time zone NOT NULL,
    unlocked_at timestamp(3) without time zone
);


ALTER TABLE public.vault_stakes OWNER TO stpoints;

--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.achievements (id, type, label, description, icon, rarity) FROM stdin;
cmnj7p1xa0000debvawtrz556	FIRST_STAKE	Vault Starter	Udělej svůj první vklad do trezoru	🏦	COMMON
cmnj7p1xp0001debv2g4jd7jx	MINING_NOOKIE	Miner Nováček	Vyřeš 10 mining challengí	⛏️	COMMON
cmnj7p1xx0002debvzysbhssy	MARKET_MAKER	Obchodník	Prodej 5 položek na tržišti	🏪	RARE
cmnj7p1y50003debvc41yovzx	WHALE	Velryba	Měj zůstatek přes 1000 ST	🐋	EPIC
cmnj7p1yb0004debvgrwxca6r	TIPPING_GENEROUS	Štědrý dárce	Pošli 5 spropitných ostatním	🎁	RARE
\.


--
-- Data for Name: activity_events; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.activity_events (id, type, payload, created_at) FROM stdin;
\.


--
-- Data for Name: case_items; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.case_items (id, case_id, type, label, amount, weight) FROM stdin;
cmnhg7rbk000294grlic0ee56	cmnhg7rb6000094grimdvbx0i	ST_REWARD	0.05 ST	0.050000	35
cmnhg7rby000494grj5hdwbfx	cmnhg7rb6000094grimdvbx0i	ST_REWARD	0.10 ST	0.100000	30
cmnhg7rc8000694gr0q27vf7s	cmnhg7rb6000094grimdvbx0i	ST_REWARD	0.12 ST	0.120000	15
cmnhg7rcf000894grmyf5tjiv	cmnhg7rb6000094grimdvbx0i	ST_REWARD	0.15 ST	0.150000	12
cmnhg7rcm000a94gr9l6iydnk	cmnhg7rb6000094grimdvbx0i	ST_REWARD	0.20 ST	0.200000	6
cmnhg7rcw000c94grmpbehhrx	cmnhg7rb6000094grimdvbx0i	MYTHIC_PASS	🌈 Mythic Pass	\N	2
cmnhg7rdf000f94grxaovetbu	cmnhg7rd5000d94grakrt3gvd	ST_REWARD	5 ST	5.000000	25
cmnhg7rdm000h94gr9xotxfyu	cmnhg7rd5000d94grakrt3gvd	ST_REWARD	7 ST	7.000000	25
cmnhg7rds000j94gr8wgmpegd	cmnhg7rd5000d94grakrt3gvd	ST_REWARD	10 ST	10.000000	20
cmnhg7rdz000l94grokitgec3	cmnhg7rd5000d94grakrt3gvd	ST_REWARD	12 ST	12.000000	15
cmnhg7re7000n94grevwgszp9	cmnhg7rd5000d94grakrt3gvd	ST_REWARD	15 ST	15.000000	12
cmnhg7ree000p94gruumubco4	cmnhg7rd5000d94grakrt3gvd	MYTHIC_PASS	🌈 Mythic Pass	\N	3
cmnhg7req000s94gr2xlc7jsw	cmnhg7rek000q94grqdqdue98	ST_REWARD	18 ST	18.000000	25
cmnhg7rey000u94grrcflxgsh	cmnhg7rek000q94grqdqdue98	ST_REWARD	22 ST	22.000000	25
cmnhg7rf4000w94groq8hs7zw	cmnhg7rek000q94grqdqdue98	ST_REWARD	28 ST	28.000000	18
cmnhg7rfa000y94griu4n7pyu	cmnhg7rek000q94grqdqdue98	ST_REWARD	35 ST	35.000000	15
cmnhg7rfi001094gr1tii689k	cmnhg7rek000q94grqdqdue98	ST_REWARD	50 ST	50.000000	7
cmnhg7rfp001294grd1g73jiq	cmnhg7rek000q94grqdqdue98	MYTHIC_PASS	🌈 Mythic Pass	\N	5
cmnhg7rfv001494grqmzwlych	cmnhg7rek000q94grqdqdue98	ST_REWARD	100 ST	100.000000	5
cmnhg7rg7001794grstbnslzu	cmnhg7rg1001594gr4tttcngm	ST_REWARD	42 ST	42.000000	22
cmnhg7rgd001994grt90dgm3k	cmnhg7rg1001594gr4tttcngm	ST_REWARD	47 ST	47.000000	20
cmnhg7rgj001b94grxovem0yz	cmnhg7rg1001594gr4tttcngm	ST_REWARD	55 ST	55.000000	15
cmnhg7rgs001d94grqnpv8aa9	cmnhg7rg1001594gr4tttcngm	ST_REWARD	65 ST	65.000000	12
cmnhg7rgy001f94grmtr2wmto	cmnhg7rg1001594gr4tttcngm	ST_REWARD	80 ST	80.000000	10
cmnhg7rh3001h94gr89lgzlaf	cmnhg7rg1001594gr4tttcngm	ST_REWARD	100 ST	100.000000	7
cmnhg7rh9001j94gr2n9z1uf8	cmnhg7rg1001594gr4tttcngm	ST_REWARD	150 ST	150.000000	5
cmnhg7rhf001l94grsiwf5pkt	cmnhg7rg1001594gr4tttcngm	MYTHIC_PASS	🌈 Mythic Pass	\N	9
cmnhjug2h000c73nfcrjydlzl	cmnhjslbz000673nfns3vgyl7	MYTHIC_PASS	MYTHIC PASS	\N	50
cmnhjtjbg000a73nf2zaarmmk	cmnhjslbz000673nfns3vgyl7	ST_REWARD	0 ST	0.000000	50
\.


--
-- Data for Name: case_openings; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.case_openings (id, user_id, case_id, item_id, cost_paid, reward_amount, reward_type, created_at) FROM stdin;
cmnhjx6vb000h73nfyoc9gvvd	cmnhj68an000bp62zain9wxu2	cmnhg7rb6000094grimdvbx0i	cmnhg7rby000494grj5hdwbfx	0.000000	0.081300	ST_REWARD	2026-04-02 14:09:50.087
cmnhk7wq4000o73nfa4gr60ip	cmnhjhyn3000dp62z6d7lumat	cmnhg7rb6000094grimdvbx0i	cmnhg7rby000494grj5hdwbfx	0.000000	0.101700	ST_REWARD	2026-04-02 14:18:10.156
cmnhmn1tp001273nf81b1kwhd	cmnhjhyn3000dp62z6d7lumat	cmnhg7rd5000d94grakrt3gvd	cmnhg7rdm000h94gr9xotxfyu	10.000000	6.698300	ST_REWARD	2026-04-02 15:25:55.837
cmnhttn07001g73nf6pdkrjxe	cmnhj68an000bp62zain9wxu2	cmnhg7rg1001594gr4tttcngm	cmnhg7rgj001b94grxovem0yz	50.000000	50.631700	ST_REWARD	2026-04-02 18:47:00.535
cmnhtu8b3001l73nfr13m9ve8	cmnhj68an000bp62zain9wxu2	cmnhg7rg1001594gr4tttcngm	cmnhg7rh3001h94gr89lgzlaf	50.000000	77.318600	ST_REWARD	2026-04-02 18:47:28.143
cmnhu83yz001y73nffddhnvi2	cmnhj68an000bp62zain9wxu2	cmnhjslbz000673nfns3vgyl7	cmnhjug2h000c73nfcrjydlzl	500.000000	\N	MYTHIC_PASS	2026-04-02 18:58:15.708
cmniir866000715sd4nb3f8y6	cmnhuabpv002373nf20x4fifd	cmnhg7rb6000094grimdvbx0i	cmnhg7rbk000294grlic0ee56	0.000000	0.050100	ST_REWARD	2026-04-03 06:24:58.398
cmniirgw4000c15sd3ta65uv9	cmnhuabpv002373nf20x4fifd	cmnhg7rek000q94grqdqdue98	cmnhg7req000s94gr2xlc7jsw	25.000000	12.487200	ST_REWARD	2026-04-03 06:25:09.7
cmniirnlq000h15sd4gqwxkgi	cmnhuabpv002373nf20x4fifd	cmnhg7rd5000d94grakrt3gvd	cmnhg7rdz000l94grokitgec3	10.000000	10.818100	ST_REWARD	2026-04-03 06:25:18.398
cmniirthe000m15sdb5k0352v	cmnhuabpv002373nf20x4fifd	cmnhg7rd5000d94grakrt3gvd	cmnhg7rdf000f94grxaovetbu	10.000000	4.422200	ST_REWARD	2026-04-03 06:25:26.018
cmniirzb2000r15sdaruvqonz	cmnhuabpv002373nf20x4fifd	cmnhg7rd5000d94grakrt3gvd	cmnhg7rdm000h94gr9xotxfyu	10.000000	7.126400	ST_REWARD	2026-04-03 06:25:33.566
cmniis52p000w15sdqe8orgjk	cmnhuabpv002373nf20x4fifd	cmnhg7rd5000d94grakrt3gvd	cmnhg7rdf000f94grxaovetbu	10.000000	4.429500	ST_REWARD	2026-04-03 06:25:41.041
cmnim3g6z0007kq0nw2b3j9ke	cmnhjhyn3000dp62z6d7lumat	cmnhg7rek000q94grqdqdue98	cmnhg7rf4000w94groq8hs7zw	25.000000	20.692300	ST_REWARD	2026-04-03 07:58:27.515
cmninlq40000a20ohltws016p	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rg7001794grstbnslzu	50.000000	33.706100	ST_REWARD	2026-04-03 08:40:39.792
cmninlvz2000f20ohx1m0zpjj	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgs001d94grqnpv8aa9	50.000000	46.760500	ST_REWARD	2026-04-03 08:40:47.39
cmnipmgvw000hebhtqtlykdr6	cmnhjhyn3000dp62z6d7lumat	cmnhg7rek000q94grqdqdue98	cmnhg7rfa000y94griu4n7pyu	25.000000	35.000000	ST_REWARD	2026-04-03 09:37:13.724
cmnipmpce000mebhtgu2f0yhw	cmnhjhyn3000dp62z6d7lumat	cmnhg7rek000q94grqdqdue98	cmnhg7rfa000y94griu4n7pyu	25.000000	35.000000	ST_REWARD	2026-04-03 09:37:24.686
cmnipmveo000rebht9uq08l78	cmnhjhyn3000dp62z6d7lumat	cmnhg7rek000q94grqdqdue98	cmnhg7req000s94gr2xlc7jsw	25.000000	18.000000	ST_REWARD	2026-04-03 09:37:32.544
cmnipn0u2000webhtuv5jzd0n	cmnhjhyn3000dp62z6d7lumat	cmnhg7rek000q94grqdqdue98	cmnhg7rey000u94grrcflxgsh	25.000000	22.000000	ST_REWARD	2026-04-03 09:37:39.578
cmnipn6jn0011ebhtbxa0fx0a	cmnhjhyn3000dp62z6d7lumat	cmnhg7rek000q94grqdqdue98	cmnhg7req000s94gr2xlc7jsw	25.000000	18.000000	ST_REWARD	2026-04-03 09:37:46.979
cmnipnc5b0016ebhtw996j5mp	cmnhjhyn3000dp62z6d7lumat	cmnhg7rb6000094grimdvbx0i	cmnhg7rbk000294grlic0ee56	0.000000	0.050000	ST_REWARD	2026-04-03 09:37:54.239
cmnirb65500076oyh9dvmdaaq	cmnhjhyn3000dp62z6d7lumat	cmnhg7rek000q94grqdqdue98	cmnhg7req000s94gr2xlc7jsw	25.000000	18.000000	ST_REWARD	2026-04-03 10:24:25.817
cmnirbdfk000c6oyhhfxhmtnq	cmnhjhyn3000dp62z6d7lumat	cmnhg7rd5000d94grakrt3gvd	cmnhg7rds000j94gr8wgmpegd	10.000000	10.000000	ST_REWARD	2026-04-03 10:24:35.264
cmnit325w000h6oyh52rp5dsj	cmnhuabpv002373nf20x4fifd	cmnhg7rek000q94grqdqdue98	cmnhg7rey000u94grrcflxgsh	25.000000	22.000000	ST_REWARD	2026-04-03 11:14:06.644
cmnit38lk000m6oyhco2lugyz	cmnhuabpv002373nf20x4fifd	cmnhg7rek000q94grqdqdue98	cmnhg7rfa000y94griu4n7pyu	25.000000	35.000000	ST_REWARD	2026-04-03 11:14:14.984
cmnit3eoc000r6oyhexd96dnw	cmnhuabpv002373nf20x4fifd	cmnhg7rek000q94grqdqdue98	cmnhg7rey000u94grrcflxgsh	25.000000	22.000000	ST_REWARD	2026-04-03 11:14:22.86
cmnit3kbq000w6oyhh7v37ix0	cmnhuabpv002373nf20x4fifd	cmnhg7rek000q94grqdqdue98	cmnhg7rfa000y94griu4n7pyu	25.000000	35.000000	ST_REWARD	2026-04-03 11:14:30.182
cmnit3q6500116oyhgvk8333x	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgy001f94grmtr2wmto	50.000000	80.000000	ST_REWARD	2026-04-03 11:14:37.757
cmnit3vye00166oyhgococ2gj	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgd001994grt90dgm3k	50.000000	47.000000	ST_REWARD	2026-04-03 11:14:45.254
cmnit8mnq0009dhq6f12zm99o	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rh9001j94gr2n9z1uf8	50.000000	150.000000	ST_REWARD	2026-04-03 11:18:26.486
cmnit8tvz000edhq6s8mlewbw	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rh9001j94gr2n9z1uf8	50.000000	150.000000	ST_REWARD	2026-04-03 11:18:35.856
cmnit8zdm000jdhq6ii43yvue	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgd001994grt90dgm3k	50.000000	47.000000	ST_REWARD	2026-04-03 11:18:42.97
cmnit94z9000odhq6jfocwtqa	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgd001994grt90dgm3k	50.000000	47.000000	ST_REWARD	2026-04-03 11:18:50.23
cmnitcbk60013dhq6xm1gyvxw	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgy001f94grmtr2wmto	50.000000	80.000000	ST_REWARD	2026-04-03 11:21:18.726
cmnitch4r0018dhq6167r3ahx	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgy001f94grmtr2wmto	50.000000	80.000000	ST_REWARD	2026-04-03 11:21:25.947
cmnitcmdp001ddhq6q7rh1kwr	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rg7001794grstbnslzu	50.000000	42.000000	ST_REWARD	2026-04-03 11:21:32.749
cmniwz4to0004i1nr66i0f5ol	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rg7001794grstbnslzu	50.000000	42.000000	ST_REWARD	2026-04-03 13:03:01.932
cmniwzc7x0009i1nrpyhovjmu	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rg7001794grstbnslzu	50.000000	42.000000	ST_REWARD	2026-04-03 13:03:11.517
cmniwzhlm000ei1nrhlyquo2x	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgy001f94grmtr2wmto	50.000000	80.000000	ST_REWARD	2026-04-03 13:03:18.49
cmnizah4u000ti1nrfbv9g6ut	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rg7001794grstbnslzu	50.000000	42.000000	ST_REWARD	2026-04-03 14:07:50.334
cmnj0hc7d0004abrjolw1ry32	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgs001d94grqnpv8aa9	50.000000	65.000000	ST_REWARD	2026-04-03 14:41:10.153
cmnj0hhvs0009abrjbo18jmox	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rg7001794grstbnslzu	50.000000	42.000000	ST_REWARD	2026-04-03 14:41:17.512
cmnj0ho6j000eabrjdse2npyn	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rg7001794grstbnslzu	50.000000	42.000000	ST_REWARD	2026-04-03 14:41:25.675
cmnj0hvmd000jabrj6u4lus0n	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgd001994grt90dgm3k	50.000000	47.000000	ST_REWARD	2026-04-03 14:41:35.317
cmnj0i3cx000oabrjehbv1cni	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgy001f94grmtr2wmto	50.000000	80.000000	ST_REWARD	2026-04-03 14:41:45.345
cmnj0icz8000tabrj6o2ryw13	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgs001d94grqnpv8aa9	50.000000	65.000000	ST_REWARD	2026-04-03 14:41:57.812
cmnj0imxx000yabrjiec1ydh6	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgs001d94grqnpv8aa9	50.000000	65.000000	ST_REWARD	2026-04-03 14:42:10.725
cmnj0isic0015abrjmy8h9529	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rhf001l94grsiwf5pkt	50.000000	\N	MYTHIC_PASS	2026-04-03 14:42:17.94
cmnj1vttz000bts44f7l6y4jh	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rhf001l94grsiwf5pkt	50.000000	\N	MYTHIC_PASS	2026-04-03 15:20:25.799
cmnj1vzpa000gts44x6s2sis0	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgd001994grt90dgm3k	50.000000	47.000000	ST_REWARD	2026-04-03 15:20:33.406
cmnj1w5au000lts4479asrf32	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgd001994grt90dgm3k	50.000000	47.000000	ST_REWARD	2026-04-03 15:20:40.662
cmnj1wbbf000sts443d5z9htc	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rhf001l94grsiwf5pkt	50.000000	\N	MYTHIC_PASS	2026-04-03 15:20:48.459
cmnj5am6i000m140ksp6xp2xj	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rg7001794grstbnslzu	50.000000	42.000000	ST_REWARD	2026-04-03 16:55:54.57
cmnj5arsb000r140kj8e6tc53	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgs001d94grqnpv8aa9	50.000000	65.000000	ST_REWARD	2026-04-03 16:56:01.835
cmnj5awxb000w140kk5dkncpk	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgs001d94grqnpv8aa9	50.000000	65.000000	ST_REWARD	2026-04-03 16:56:08.495
cmnj5b1x30011140k01qhtwd9	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgd001994grt90dgm3k	50.000000	47.000000	ST_REWARD	2026-04-03 16:56:14.967
cmnj5b9cg0018140kpvb3eyms	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rhf001l94grsiwf5pkt	50.000000	\N	MYTHIC_PASS	2026-04-03 16:56:24.592
cmnj5belw001d140kqhll3xaj	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgd001994grt90dgm3k	50.000000	47.000000	ST_REWARD	2026-04-03 16:56:31.412
cmnk2iuq5000cyj0kxcpdajg2	cmnhuabpv002373nf20x4fifd	cmnhg7rg1001594gr4tttcngm	cmnhg7rgd001994grt90dgm3k	50.000000	47.000000	ST_REWARD	2026-04-04 08:26:06.221
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.cases (id, name, description, price, is_daily, is_active, sort_order, created_at) FROM stdin;
cmnhg7rg1001594gr4tttcngm	👑 Elite Case	Elitní case za 50 ST. Nejvyšší šance na Mythic Pass!	50.000000	f	t	3	2026-04-02 12:26:04.849
cmnhjslbz000673nfns3vgyl7	MYTHIC NEBO NIC	Vyhraj MYTHIC PASS, nebo přijdeš o všechno.	500.000000	f	t	4	2026-04-02 14:06:15.552
cmnhg7rb6000094grimdvbx0i	🎁 Denní Case	Zdarma jednou za den — odměny a šance na Mythic Pass!	0.000000	t	t	0	2026-04-02 12:26:04.674
cmnhg7rd5000d94grakrt3gvd	📦 Starter Case	Základní case za 10 ST. 3% šance na MYTHIC PASS	10.000000	f	t	1	2026-04-02 12:26:04.745
cmnhg7rek000q94grqdqdue98	💎 Premium Case	Premium case za 25 ST. 5% šance na MYTHIC PASS	25.000000	f	t	2	2026-04-02 12:26:04.796
\.


--
-- Data for Name: giveaway_entries; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.giveaway_entries (id, giveaway_id, user_id, joined_at) FROM stdin;
\.


--
-- Data for Name: giveaway_winners; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.giveaway_winners (id, giveaway_id, user_id, place, amount) FROM stdin;
\.


--
-- Data for Name: giveaways; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.giveaways (id, title, "prizePool", winner_count, distribution, status, created_by, ends_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: market_bids; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.market_bids (id, listing_id, bidder_id, amount, created_at) FROM stdin;
\.


--
-- Data for Name: market_listings; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.market_listings (id, type, price, status, seller_id, pass_id, username_id, buyer_id, sold_at, st_due_at, st_paid_at, created_at, current_highest_bid, ends_at, is_auction, min_increment, starting_price) FROM stdin;
cmniqrymt00063l64o03ky8jr	USERNAME	10.000000	CANCELLED	cmnhuabpv002373nf20x4fifd	\N	cmniqru3n00023l64fox78h13	\N	\N	\N	\N	2026-04-03 10:09:29.621	\N	\N	f	\N	\N
cmnj1x5py000wts44tpvl8yk5	MYTHIC_PASS	999.000000	CANCELLED	cmnhuabpv002373nf20x4fifd	cmnj1wbau000ots442bvs7dg4	\N	\N	\N	\N	\N	2026-04-03 15:21:27.862	\N	\N	f	\N	\N
cmnj1wp17000uts44gj8cg2cg	MYTHIC_PASS	999.000000	CANCELLED	cmnhuabpv002373nf20x4fifd	cmnj1vtt60007ts443ge5etsk	\N	\N	\N	\N	\N	2026-04-03 15:21:06.235	\N	\N	f	\N	\N
cmnj7prho0006debv0rkhk231	MYTHIC_PASS	1.000000	CANCELLED	cmnhuabpv002373nf20x4fifd	cmnj5b9bt0014140kx3fe8t0d	\N	\N	\N	\N	\N	2026-04-03 18:03:40.523	\N	\N	f	\N	\N
cmnj7srm70008debvk6pftjah	MYTHIC_PASS	100.000000	CANCELLED	cmnhuabpv002373nf20x4fifd	cmnj1wbau000ots442bvs7dg4	\N	\N	\N	\N	\N	2026-04-03 18:06:00.654	\N	\N	f	\N	\N
\.


--
-- Data for Name: mining_challenges; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.mining_challenges (id, user_id, prefix, difficulty, target, status, nonce, result_hash, hashes_computed, reward, issued_at, expires_at, solved_at) FROM stdin;
\.


--
-- Data for Name: pass_code_logs; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.pass_code_logs (id, code, type, used_by, user_id, created_at) FROM stdin;
cmnhidx0b0001vsbr62c3nzpk	ZUDJHD	USED	osamason	cmnhidwz00000vsbrg2okik8f	2026-04-02 13:26:51.226
cmnhie5kp0002vsbrfr43p4em	BM2GV5	ADMIN_CHANGED	Admin (st_admin)	\N	2026-04-02 13:27:02.329
cmnhiruja0003p62zoacghanj	BYVNBN	ADMIN_CHANGED	Admin (st_admin)	\N	2026-04-02 13:37:41.205
cmnhj68bm000cp62zp1fe23ku	P9T2FC	USED	st_admin	cmnhj68an000bp62zain9wxu2	2026-04-02 13:48:52.257
cmnhjhyo0000ep62zy1e4spy8	WPV5GH	USED	vial	cmnhjhyn3000dp62z6d7lumat	2026-04-02 13:57:59.616
cmnhjz0d8000j73nfzewyg6dn	AJXURW	USED	test	cmnhjz0bx000i73nfyrev3wib	2026-04-02 14:11:14.971
cmnhuabqq002473nflx4iw745	TD2NXJ	USED	svt	cmnhuabpv002373nf20x4fifd	2026-04-02 18:59:59.09
cmniucr3a0002k3toiod979bw	PCU837	USED	test	cmniucr1q0001k3toxexfwclc	2026-04-03 11:49:38.47
cmnj3rl3g00038pqh4ffwwh9n	4BU2SX	USED	matejcurak	cmnj3rl1n00018pqhgh4k2wv5	2026-04-03 16:13:07.084
cmnj43h5q0007lapbs5urh6v0	M4CBY3	USED	matejcurak	cmnj43h2a0001lapbbi3igxfj	2026-04-03 16:22:21.854
\.


--
-- Data for Name: stroom_sessions; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.stroom_sessions (id, user_id, teacher_id, cost, expires_at, created_at) FROM stdin;
cmnhu8ir0002173nfj3rc3lwg	cmnhj68an000bp62zain9wxu2	cmnhg20q90001q1webrz6fglt	0.000000	2026-04-02 19:08:34.857	2026-04-02 18:58:34.86
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.system_settings (key, value, updated_at) FROM stdin;
PASS_CODE	33PEFK	2026-04-03 16:22:21.854
\.


--
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.teachers (id, name, is_active, created_at, rarity) FROM stdin;
cmnher06p00057t9micp1rdos	N. Skálová	t	2026-04-02 11:45:03.409	COMMON
cmnher06p00097t9mkhz04m8q	S. Smitka	t	2026-04-02 11:45:03.409	COMMON
cmnher06p000c7t9m9rd3ybe7	V. Burešová	t	2026-04-02 11:45:03.409	COMMON
cmnher06p00027t9mtjzfa7q4	E. Šplíchalová	t	2026-04-02 11:45:03.409	MYTHIC
cmnher06p00067t9me8chulqz	J. Anderle	t	2026-04-02 11:45:03.409	EPIC
cmnher06p00037t9md6v7t3n4	J. Ježík	t	2026-04-02 11:45:03.409	LEGENDARY
cmnhf1uts000d7t9mvk3xso3d	L. Krausová	t	2026-04-02 11:53:29.679	RARE
cmnher06p00007t9myr9v09g1	K Vlna	t	2026-04-02 11:45:03.409	LEGENDARY
cmnher06p000a7t9mg4wv0w73	K. Bartáková	t	2026-04-02 11:45:03.409	EPIC
cmnher06p00077t9m3i52urry	L. Zavadilová	t	2026-04-02 11:45:03.409	EPIC
cmnher06p000b7t9m9vl5o02f	M. Skřivanová	t	2026-04-02 11:45:03.409	EPIC
cmnher06p00017t9mnzomfa22	P. Lukešová	t	2026-04-02 11:45:03.409	MYTHIC
cmnher06p00047t9m5aoqj9j9	P. Sobotka	t	2026-04-02 11:45:03.409	LEGENDARY
cmnher06p00087t9mzesb4wiw	V. Kolář	t	2026-04-02 11:45:03.409	MYTHIC
cmnhg1v2i0000q1weaguga4y8	I. Frank	t	2026-04-02 12:21:29.61	MYTHIC
cmnhg20q90001q1webrz6fglt	ROMAN	t	2026-04-02 12:21:36.943	MYTHIC
cmnhg27kk0002q1wexw3vlswj	V. Mrákota	t	2026-04-02 12:21:45.812	MYTHIC
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.transactions (id, type, amount, description, sender_id, receiver_id, balance_before, balance_after, metadata, created_at) FROM stdin;
cmnhjnpuh000273nfwrv1324b	MINING_REWARD	0.987313	Těžba: 2m 6s	\N	cmnhjhyn3000dp62z6d7lumat	0.000000	0.987313	\N	2026-04-02 14:02:28.121
cmnhjocff000573nftij8m203	MINING_REWARD	0.162902	Těžba: 0m 18s	\N	cmnhjhyn3000dp62z6d7lumat	0.987313	1.150215	\N	2026-04-02 14:02:57.387
cmnhjx6v0000f73nflepa49px	CASE_OPENING	0.000000	Case: 🎁 Denní Case → 0.10 ST	cmnhj68an000bp62zain9wxu2	cmnhj68an000bp62zain9wxu2	0.000000	0.081300	\N	2026-04-02 14:09:50.076
cmnhk7wpt000m73nfeqser5hm	CASE_OPENING	0.000000	Case: 🎁 Denní Case → 0.10 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	1.150215	1.251915	\N	2026-04-02 14:18:10.145
cmnhkczlm000r73nf16x0wug2	MINING_REWARD	1.839964	Těžba: 3m 42s	\N	cmnhjhyn3000dp62z6d7lumat	1.251915	3.091879	\N	2026-04-02 14:22:07.162
cmnhmeqn6000u73nf4x9iklvg	MINING_REWARD	5.767026	Těžba: 11m 5s	\N	cmnhjhyn3000dp62z6d7lumat	3.091879	8.858905	\N	2026-04-02 15:19:28.098
cmnhmmrz9000x73nfctj83847	MINING_REWARD	2.988953	Těžba: 5m 45s	\N	cmnhjhyn3000dp62z6d7lumat	8.858905	11.847858	\N	2026-04-02 15:25:43.077
cmnhmn1te001073nfhp2a3d5j	CASE_OPENING	10.000000	Case: 📦 Starter Case → 7 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	11.847858	8.546158	\N	2026-04-02 15:25:55.826
cmnhslikm001573nfrlzcwiw7	MINING_REWARD	0.042730	Těžba: 0m 5s	\N	cmnhj68an000bp62zain9wxu2	0.081300	0.124030	\N	2026-04-02 18:12:41.926
cmnhtrqwx001873nfzmygohvn	MINING_REWARD	0.233274	Těžba: 0m 30s	\N	cmnhj68an000bp62zain9wxu2	0.124030	0.357304	\N	2026-04-02 18:45:32.289
cmnhtshuz001b73nf0u7zhps4	ADMIN_GRANT	100.000000	Admin Grant: s	\N	cmnhj68an000bp62zain9wxu2	0.357304	100.357304	{"reason": "s", "grantedBy": "cmnhj68an000bp62zain9wxu2"}	2026-04-02 18:46:07.211
cmnhttmzx001e73nfizgm9m2j	CASE_OPENING	50.000000	Case: 👑 Elite Case → 55 ST	cmnhj68an000bp62zain9wxu2	cmnhj68an000bp62zain9wxu2	100.357304	100.989004	\N	2026-04-02 18:47:00.525
cmnhtu8as001j73nf1n169nrc	CASE_OPENING	50.000000	Case: 👑 Elite Case → 100 ST	cmnhj68an000bp62zain9wxu2	cmnhj68an000bp62zain9wxu2	100.989004	128.307604	\N	2026-04-02 18:47:28.132
cmnhu7q3f001o73nf7meoxrb4	ADMIN_GRANT	128.000000	Admin Grant: s	\N	cmnhj68an000bp62zain9wxu2	128.307604	256.307604	{"reason": "s", "grantedBy": "cmnhj68an000bp62zain9wxu2"}	2026-04-02 18:57:57.723
cmnhu7ya5001r73nfudwo8wp1	ADMIN_GRANT	244.000000	Admin Grant: s	\N	cmnhj68an000bp62zain9wxu2	256.307604	500.307604	{"reason": "s", "grantedBy": "cmnhj68an000bp62zain9wxu2"}	2026-04-02 18:58:08.333
cmnhu83yq001w73nfsswbkg84	CASE_OPENING	500.000000	Case: MYTHIC NEBO NIC → MYTHIC PASS	cmnhj68an000bp62zain9wxu2	cmnhj68an000bp62zain9wxu2	500.307604	0.307604	\N	2026-04-02 18:58:15.698
cmniiqw0f000215sdz4eqq6pv	MINING_REWARD	31.960853	Těžba: 70m 58s	\N	cmnhuabpv002373nf20x4fifd	0.000000	31.960853	\N	2026-04-03 06:24:42.639
cmniir85w000515sdk4zcylot	CASE_OPENING	0.000000	Case: 🎁 Denní Case → 0.05 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	31.960853	32.010953	\N	2026-04-03 06:24:58.388
cmniirgvx000a15sd1hss6o3p	CASE_OPENING	25.000000	Case: 💎 Premium Case → 18 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	32.010953	19.498153	\N	2026-04-03 06:25:09.693
cmniirnlj000f15sdfzy9xe4w	CASE_OPENING	10.000000	Case: 📦 Starter Case → 12 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	19.498153	20.316253	\N	2026-04-03 06:25:18.391
cmniirth7000k15sdf9cxzz28	CASE_OPENING	10.000000	Case: 📦 Starter Case → 5 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	20.316253	14.738453	\N	2026-04-03 06:25:26.011
cmniirzau000p15sd0iqxfvmp	CASE_OPENING	10.000000	Case: 📦 Starter Case → 7 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	14.738453	11.864853	\N	2026-04-03 06:25:33.558
cmniis52h000u15sd12pud8qf	CASE_OPENING	10.000000	Case: 📦 Starter Case → 5 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	11.864853	6.294353	\N	2026-04-03 06:25:41.033
cmnim2v7w0002kq0nd0e26t46	MINING_REWARD	22.590136	Těžba: 41m 45s	\N	cmnhjhyn3000dp62z6d7lumat	8.546158	31.136294	\N	2026-04-03 07:58:00.332
cmnim3g6n0005kq0n6zuinmwx	CASE_OPENING	25.000000	Case: 💎 Premium Case → 28 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	31.136294	26.828594	\N	2026-04-03 07:58:27.503
cmninlms2000520oha3q86gel	MINING_REWARD	62.184033	Těžba: 134m 14s	\N	cmnhuabpv002373nf20x4fifd	6.294353	68.478386	\N	2026-04-03 08:40:35.474
cmninlq3p000820ohtlcgf7uv	CASE_OPENING	50.000000	Case: 👑 Elite Case → 42 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	68.478386	52.184486	\N	2026-04-03 08:40:39.781
cmninlvyu000d20ohn93o6rii	CASE_OPENING	50.000000	Case: 👑 Elite Case → 65 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	52.184486	48.944986	\N	2026-04-03 08:40:47.382
cmnio5iwe0002c6f4in4qje8c	MINING_REWARD	0.043369	Těžba: 0m 5s	\N	cmnhjhyn3000dp62z6d7lumat	26.828594	26.871963	\N	2026-04-03 08:56:03.566
cmnioaalh0007c6f4kkxd95oc	HANDLE_CREATE	2.000000	Handle @che created	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	26.871963	24.871963	\N	2026-04-03 08:59:46.083
cmnioarch0004bkrdv9a692gg	HANDLE_CREATE	2.000000	Handle @luv created	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	24.871963	22.871963	\N	2026-04-03 09:00:07.791
cmniob67a0009bkrdrm15f4fy	HANDLE_CREATE	2.000000	Handle @restinbass created	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	22.871963	20.871963	\N	2026-04-03 09:00:27.044
cmnios7kz0004ebhtss5w5led	HANDLE_CREATE	2.000000	Handle @bass created	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	20.871963	18.871963	\N	2026-04-03 09:13:41.985
cmniotgm40009ebhti0vt0fg2	HANDLE_CREATE	2.000000	Handle @rib created	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	18.871963	16.871963	\N	2026-04-03 09:14:40.346
cmnipm3yd000cebhtkg84elae	MINING_REWARD	11.477632	Těžba: 21m 42s	\N	cmnhjhyn3000dp62z6d7lumat	16.871963	28.349595	\N	2026-04-03 09:36:56.965
cmnipmgvl000febhtsexalqmz	CASE_OPENING	25.000000	Case: 💎 Premium Case → 35 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	28.349595	38.349595	\N	2026-04-03 09:37:13.713
cmnipmpc6000kebht4txn90dw	CASE_OPENING	25.000000	Case: 💎 Premium Case → 35 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	38.349595	48.349595	\N	2026-04-03 09:37:24.678
cmnipmveh000pebht97vw9zqu	CASE_OPENING	25.000000	Case: 💎 Premium Case → 18 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	48.349595	41.349595	\N	2026-04-03 09:37:32.536
cmnipn0tv000uebhtgvcy8mrg	CASE_OPENING	25.000000	Case: 💎 Premium Case → 22 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	41.349595	38.349595	\N	2026-04-03 09:37:39.571
cmnipn6jg000zebht8ir1c5ku	CASE_OPENING	25.000000	Case: 💎 Premium Case → 18 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	38.349595	31.349595	\N	2026-04-03 09:37:46.972
cmnipnc540014ebhtx3xrays0	CASE_OPENING	0.000000	Case: 🎁 Denní Case → 0.05 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	31.349595	31.399595	\N	2026-04-03 09:37:54.232
cmniqmo930004mtfmf035lt2u	HANDLE_CREATE	2.000000	Handle @svt created	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	48.944986	46.944986	\N	2026-04-03 10:05:22.885
cmniqru3p00043l64crv1h67s	HANDLE_CREATE	10.000000	Handle @100 created	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	46.944986	36.944986	\N	2026-04-03 10:09:23.747
cmniraoam00026oyh42gd1z45	MINING_REWARD	0.078181	Těžba: 0m 10s	\N	cmnhjhyn3000dp62z6d7lumat	31.399595	31.477776	\N	2026-04-03 10:24:02.686
cmnirb64u00056oyhs54f0h31	CASE_OPENING	25.000000	Case: 💎 Premium Case → 18 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	31.477776	24.477776	\N	2026-04-03 10:24:25.806
cmnirbdfc000a6oyhpfxrxpr5	CASE_OPENING	10.000000	Case: 📦 Starter Case → 10 ST	cmnhjhyn3000dp62z6d7lumat	cmnhjhyn3000dp62z6d7lumat	24.477776	24.477776	\N	2026-04-03 10:24:35.256
cmnit325i000f6oyhvfekxe7p	CASE_OPENING	25.000000	Case: 💎 Premium Case → 22 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	36.944986	33.944986	\N	2026-04-03 11:14:06.629
cmnit38ld000k6oyhhfrbksyv	CASE_OPENING	25.000000	Case: 💎 Premium Case → 35 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	33.944986	43.944986	\N	2026-04-03 11:14:14.977
cmnit3eo4000p6oyhw5cast6a	CASE_OPENING	25.000000	Case: 💎 Premium Case → 22 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	43.944986	40.944986	\N	2026-04-03 11:14:22.852
cmnit3kbj000u6oyh8p72we7p	CASE_OPENING	25.000000	Case: 💎 Premium Case → 35 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	40.944986	50.944986	\N	2026-04-03 11:14:30.175
cmnit3q5y000z6oyhxgm7z1c3	CASE_OPENING	50.000000	Case: 👑 Elite Case → 80 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	50.944986	80.944986	\N	2026-04-03 11:14:37.75
cmnit3vy600146oyhqbgsxavq	CASE_OPENING	50.000000	Case: 👑 Elite Case → 47 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	80.944986	77.944986	\N	2026-04-03 11:14:45.246
cmnit893t0002dhq6dx1xdvo1	TRANSFER	1.000000	Převod: cau (poplatek: 0.02 ST)	cmnhuabpv002373nf20x4fifd	cmnhjhyn3000dp62z6d7lumat	77.944986	76.924986	\N	2026-04-03 11:18:08.921
cmnit89430004dhq6g1nji17a	TRANSFER	1.000000	Převod od s: cau	cmnhuabpv002373nf20x4fifd	cmnhjhyn3000dp62z6d7lumat	24.477776	25.477776	\N	2026-04-03 11:18:08.931
cmnit8mnf0007dhq66rn52sf4	CASE_OPENING	50.000000	Case: 👑 Elite Case → 150 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	76.924986	176.924986	\N	2026-04-03 11:18:26.475
cmnit8tvq000cdhq682z7x4pn	CASE_OPENING	50.000000	Case: 👑 Elite Case → 150 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	176.924986	276.924986	\N	2026-04-03 11:18:35.846
cmnit8zde000hdhq684k5g2el	CASE_OPENING	50.000000	Case: 👑 Elite Case → 47 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	276.924986	273.924986	\N	2026-04-03 11:18:42.962
cmnit94z2000mdhq6o93acm7p	CASE_OPENING	50.000000	Case: 👑 Elite Case → 47 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	273.924986	270.924986	\N	2026-04-03 11:18:50.222
cmnit9ivd000rdhq6q4kjnonr	TRANSFER	1.000000	Převod: cau (poplatek: 0.02 ST)	cmnhjhyn3000dp62z6d7lumat	cmnhuabpv002373nf20x4fifd	25.477776	24.457776	\N	2026-04-03 11:19:08.233
cmnit9ivl000tdhq6qhhphzpk	TRANSFER	1.000000	Převod od vial: cau	cmnhjhyn3000dp62z6d7lumat	cmnhuabpv002373nf20x4fifd	270.924986	271.924986	\N	2026-04-03 11:19:08.24
cmnita4ti000wdhq6n0q3vyru	TRANSFER	1.000000	Převod: 1 (poplatek: 0.02 ST)	cmnhuabpv002373nf20x4fifd	cmnhjhyn3000dp62z6d7lumat	271.924986	270.904986	\N	2026-04-03 11:19:36.678
cmnita4to000ydhq6wlqgaxni	TRANSFER	1.000000	Převod od s: 1	cmnhuabpv002373nf20x4fifd	cmnhjhyn3000dp62z6d7lumat	24.457776	25.457776	\N	2026-04-03 11:19:36.684
cmnitcbjw0011dhq6rldmopz5	CASE_OPENING	50.000000	Case: 👑 Elite Case → 80 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	270.904986	300.904986	\N	2026-04-03 11:21:18.716
cmnitch4k0016dhq6f1jjkzpo	CASE_OPENING	50.000000	Case: 👑 Elite Case → 80 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	300.904986	330.904986	\N	2026-04-03 11:21:25.94
cmnitcmdi001bdhq6wha44uzu	CASE_OPENING	50.000000	Case: 👑 Elite Case → 42 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	330.904986	322.904986	\N	2026-04-03 11:21:32.742
cmniwz4tc0002i1nrca66ly15	CASE_OPENING	50.000000	Case: 👑 Elite Case → 42 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	322.904986	314.904986	\N	2026-04-03 13:03:01.92
cmniwzc7q0007i1nr7jz6c5vl	CASE_OPENING	50.000000	Case: 👑 Elite Case → 42 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	314.904986	306.904986	\N	2026-04-03 13:03:11.51
cmniwzhle000ci1nrgl9ixg9w	CASE_OPENING	50.000000	Case: 👑 Elite Case → 80 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	306.904986	336.904986	\N	2026-04-03 13:03:18.482
cmniwzyi8000hi1nrx96bsanz	MINING_REWARD	0.055756	Těžba: 0m 6s	\N	cmnhuabpv002373nf20x4fifd	336.904986	336.960742	\N	2026-04-03 13:03:40.4
cmniyfq41000li1nrcpirzexl	MINING_REWARD	0.070184	Těžba: 0m 9s	\N	cmnhuabpv002373nf20x4fifd	336.960742	337.030926	\N	2026-04-03 13:43:55.633
cmnizadzv000oi1nr8qhu2tpz	MINING_REWARD	0.053300	Těžba: 0m 6s	\N	cmnhuabpv002373nf20x4fifd	337.030926	337.084226	\N	2026-04-03 14:07:46.267
cmnizah4k000ri1nr1t86f9qx	CASE_OPENING	50.000000	Case: 👑 Elite Case → 42 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	337.084226	329.084226	\N	2026-04-03 14:07:50.324
cmnizxbbk0010i1nrqz4k0p6t	HANDLE_CREATE	2.000000	Handle @svt0 created	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	329.084226	327.084226	\N	2026-04-03 14:25:35.886
cmnj0hc720002abrjy1656eln	CASE_OPENING	50.000000	Case: 👑 Elite Case → 65 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	327.084226	342.084226	\N	2026-04-03 14:41:10.142
cmnj0hhvk0007abrjiiocng0b	CASE_OPENING	50.000000	Case: 👑 Elite Case → 42 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	342.084226	334.084226	\N	2026-04-03 14:41:17.504
cmnj0ho6c000cabrjs4bphi6e	CASE_OPENING	50.000000	Case: 👑 Elite Case → 42 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	334.084226	326.084226	\N	2026-04-03 14:41:25.668
cmnj0hvm6000habrjydtb2evb	CASE_OPENING	50.000000	Case: 👑 Elite Case → 47 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	326.084226	323.084226	\N	2026-04-03 14:41:35.31
cmnj0i3cp000mabrjdken0n8h	CASE_OPENING	50.000000	Case: 👑 Elite Case → 80 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	323.084226	353.084226	\N	2026-04-03 14:41:45.337
cmnj0icz0000rabrjb5mk1f99	CASE_OPENING	50.000000	Case: 👑 Elite Case → 65 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	353.084226	368.084226	\N	2026-04-03 14:41:57.804
cmnj0imxq000wabrjuom62yqr	CASE_OPENING	50.000000	Case: 👑 Elite Case → 65 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	368.084226	383.084226	\N	2026-04-03 14:42:10.718
cmnj0isi50013abrj99kr6t7q	CASE_OPENING	50.000000	Case: 👑 Elite Case → 🌈 Mythic Pass	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	383.084226	333.084226	\N	2026-04-03 14:42:17.933
cmnj1vglo0002ts44q1q6uvfb	TRANSFER	1.000000	Převod: 1 (poplatek: 0.02 ST)	cmnhuabpv002373nf20x4fifd	cmnhjhyn3000dp62z6d7lumat	333.084226	332.064226	\N	2026-04-03 15:20:08.652
cmnj1vgly0004ts44llbbepvs	TRANSFER	1.000000	Převod od s: 1	cmnhuabpv002373nf20x4fifd	cmnhjhyn3000dp62z6d7lumat	25.457776	26.457776	\N	2026-04-03 15:20:08.662
cmnj1vtto0009ts44hfhs1zx8	CASE_OPENING	50.000000	Case: 👑 Elite Case → 🌈 Mythic Pass	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	332.064226	282.064226	\N	2026-04-03 15:20:25.788
cmnj1vzp2000ets442b0m55of	CASE_OPENING	50.000000	Case: 👑 Elite Case → 47 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	282.064226	279.064226	\N	2026-04-03 15:20:33.398
cmnj1w5an000jts44b0mycwxt	CASE_OPENING	50.000000	Case: 👑 Elite Case → 47 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	279.064226	276.064226	\N	2026-04-03 15:20:40.654
cmnj1wbb8000qts44uhk173mu	CASE_OPENING	50.000000	Case: 👑 Elite Case → 🌈 Mythic Pass	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	276.064226	226.064226	\N	2026-04-03 15:20:48.452
cmnj24wmj0015ts44sge4w91f	MINING_REWARD	24.112371	Těžba: 51m 33s	\N	cmnhjhyn3000dp62z6d7lumat	26.457776	50.570147	\N	2026-04-03 15:27:29.323
cmnj2mmd40002f43jbg1bv1yx	MINING_REWARD	7.605189	Těžba: 13m 42s	\N	cmnhjhyn3000dp62z6d7lumat	50.570147	58.175336	\N	2026-04-03 15:41:15.832
cmnj2v8s00004tg3w9us92vw9	HANDLE_CREATE	2.000000	Handle @svt created	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	226.064226	224.064226	\N	2026-04-03 15:47:58.126
cmnj2veqt0009tg3w7u6smaq3	HANDLE_CREATE	2.000000	Handle @svt created	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	224.064226	222.064226	\N	2026-04-03 15:48:05.859
cmnj43h470004lapbscpv1g2l	REFERRAL_REWARD	20.000000	Bonus za pozvání: matejcurak	\N	cmnhj68an000bp62zain9wxu2	0.307604	20.307604	\N	2026-04-03 16:22:21.799
cmnj54ttc0004140kdron1e6o	HANDLE_CREATE	2.000000	Handle @svt created	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	222.064226	220.064226	\N	2026-04-03 16:51:24.525
cmnj555ll0009140k7b766ly0	HANDLE_CREATE	2.000000	Handle @osamason created	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	220.064226	218.064226	\N	2026-04-03 16:51:39.798
cmnj55qe5000e140koap8t1yq	HANDLE_CREATE	2.000000	Handle @001 created	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	218.064226	216.064226	\N	2026-04-03 16:52:06.747
cmnj5akdo000h140kgnbo7op3	MINING_REWARD	0.334327	Těžba: 0m 43s	\N	cmnhuabpv002373nf20x4fifd	216.064226	216.398553	\N	2026-04-03 16:55:52.236
cmnj5am68000k140k0t5dklqs	CASE_OPENING	50.000000	Case: 👑 Elite Case → 42 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	216.398553	208.398553	\N	2026-04-03 16:55:54.56
cmnj5ars3000p140koec778go	CASE_OPENING	50.000000	Case: 👑 Elite Case → 65 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	208.398553	223.398553	\N	2026-04-03 16:56:01.827
cmnj5awx0000u140kmvgy7t3u	CASE_OPENING	50.000000	Case: 👑 Elite Case → 65 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	223.398553	238.398553	\N	2026-04-03 16:56:08.484
cmnj5b1ww000z140ktbkhggku	CASE_OPENING	50.000000	Case: 👑 Elite Case → 47 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	238.398553	235.398553	\N	2026-04-03 16:56:14.959
cmnj5b9c90016140kx2ajcc95	CASE_OPENING	50.000000	Case: 👑 Elite Case → 🌈 Mythic Pass	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	235.398553	185.398553	\N	2026-04-03 16:56:24.585
cmnj5belo001b140kk28eqsao	CASE_OPENING	50.000000	Case: 👑 Elite Case → 47 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	185.398553	182.398553	\N	2026-04-03 16:56:31.404
cmnk2ir5l0007yj0kxrizfnw5	MINING_REWARD	0.056609	Těžba: 0m 7s	\N	cmnhuabpv002373nf20x4fifd	182.398553	182.455162	\N	2026-04-04 08:26:01.593
cmnk2iupu000ayj0k8nmvfu9n	CASE_OPENING	50.000000	Case: 👑 Elite Case → 47 ST	cmnhuabpv002373nf20x4fifd	cmnhuabpv002373nf20x4fifd	182.455162	179.455162	\N	2026-04-04 08:26:06.21
\.


--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.user_achievements (id, user_id, achievement_id, earned_at) FROM stdin;
\.


--
-- Data for Name: user_passes; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.user_passes (id, user_id, is_used, used_at, obtained_at) FROM stdin;
cmnhu83y8001u73nfcxkvveu5	cmnhj68an000bp62zain9wxu2	t	2026-04-02 18:58:34.851	2026-04-02 18:58:15.68
cmnj0ishq0011abrjkjyrdzc8	cmnhuabpv002373nf20x4fifd	f	\N	2026-04-03 14:42:17.918
cmnj1vtt60007ts443ge5etsk	cmnhuabpv002373nf20x4fifd	f	\N	2026-04-03 15:20:25.77
cmnj1wbau000ots442bvs7dg4	cmnhuabpv002373nf20x4fifd	f	\N	2026-04-03 15:20:48.438
cmnj5b9bt0014140kx3fe8t0d	cmnhuabpv002373nf20x4fifd	f	\N	2026-04-03 16:56:24.569
\.


--
-- Data for Name: usernames; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.usernames (id, handle, owner_id, can_sell_at, is_active, created_at) FROM stdin;
cmnioaalf0005c6f4bqouvicg	che	cmnhjhyn3000dp62z6d7lumat	2026-04-04 08:59:46.069	t	2026-04-03 08:59:46.083
cmniob6780007bkrdbp389o6u	restinbass	cmnhjhyn3000dp62z6d7lumat	2026-04-04 09:00:27.036	t	2026-04-03 09:00:27.044
cmnioarcf0002bkrd9eirf062	luv	cmnhjhyn3000dp62z6d7lumat	2026-04-04 09:00:07.768	f	2026-04-03 09:00:07.791
cmnios7kx0002ebht9yowxei0	bass	cmnhjhyn3000dp62z6d7lumat	2026-04-04 09:13:41.968	f	2026-04-03 09:13:41.985
cmniotgm20007ebht0khd7rt6	rib	cmnhjhyn3000dp62z6d7lumat	2026-04-04 09:14:40.341	t	2026-04-03 09:14:40.346
cmniqru3n00023l64fox78h13	100	cmnhuabpv002373nf20x4fifd	2026-04-03 10:09:23.729	f	2026-04-03 10:09:23.747
cmnizxbbi000yi1nruyqrel76	svt0	cmnhuabpv002373nf20x4fifd	2026-04-04 14:25:35.875	f	2026-04-03 14:25:35.886
cmnj54tt90002140kp0atgnio	svt	cmnhuabpv002373nf20x4fifd	2026-04-04 16:51:24.512	t	2026-04-03 16:51:24.525
cmnj555li0007140k41mbibgx	osamason	cmnhuabpv002373nf20x4fifd	2026-04-04 16:51:39.792	t	2026-04-03 16:51:39.798
cmnj55qe3000c140k8ol0a8ar	001	cmnhuabpv002373nf20x4fifd	2026-04-04 16:52:06.741	t	2026-04-03 16:52:06.747
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.users (id, username, password_hash, balance, role, is_active, last_active_at, created_at, updated_at, mining_started_at, referral_count, referrer_id, wallet_address, referral_clicks) FROM stdin;
cmnhjz0bx000i73nfyrev3wib	.	$2a$12$I1juCsxH3hS02ZRF6MdEE.0L0/MCum4N7baVSRc6xVhNjrYwKdtUS	0.000000	USER	t	2026-04-03 11:20:18.984	2026-04-02 14:11:14.925	2026-04-03 11:20:19.323	\N	0	\N	\N	0
cmnhj68an000bp62zain9wxu2	st_admin	$2a$12$4iHehSQw.Dcul5bdDkxS4.MRfewBLOCqSGPcevJ.l5yNdH8wrivTG	20.307604	ADMIN	t	2026-04-03 16:22:39.335	2026-04-02 13:48:52.223	2026-04-03 16:22:39.338	\N	1	\N	0xa6bf6caff03cad314ada6440041d1897daa85de1	0
cmnhuabpv002373nf20x4fifd	s	$2a$12$PbFFEoGEhGO/HJFjJ.IHwOUyZH93BxtY.Bc4H5FYdt0nfYhZPedY2	179.455162	USER	t	2026-04-04 08:26:01.576	2026-04-02 18:59:59.059	2026-04-04 08:26:06.2	\N	0	\N	0x2e394afe6d2a4f0aa7647903549b1e2613fb60da	0
cmnhjhyn3000dp62z6d7lumat	vial	$2a$12$I9n7TNI/QDqr9bYDJPQNeetwNYsFTccs/vaYB/759RoK88H8Ccwz6	58.175336	USER	t	2026-04-03 16:41:36.849	2026-04-02 13:57:59.583	2026-04-03 16:52:10.425	\N	0	\N	0x91477ec45e21843be6bd86dd2c7c944ddd555895	1
\.


--
-- Data for Name: vault_stakes; Type: TABLE DATA; Schema: public; Owner: stpoints
--

COPY public.vault_stakes (id, user_id, amount, apy, expected_yield, status, locked_at, unlocks_at, unlocked_at) FROM stdin;
\.


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: activity_events activity_events_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_pkey PRIMARY KEY (id);


--
-- Name: case_items case_items_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.case_items
    ADD CONSTRAINT case_items_pkey PRIMARY KEY (id);


--
-- Name: case_openings case_openings_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.case_openings
    ADD CONSTRAINT case_openings_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: giveaway_entries giveaway_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.giveaway_entries
    ADD CONSTRAINT giveaway_entries_pkey PRIMARY KEY (id);


--
-- Name: giveaway_winners giveaway_winners_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.giveaway_winners
    ADD CONSTRAINT giveaway_winners_pkey PRIMARY KEY (id);


--
-- Name: giveaways giveaways_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.giveaways
    ADD CONSTRAINT giveaways_pkey PRIMARY KEY (id);


--
-- Name: market_bids market_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.market_bids
    ADD CONSTRAINT market_bids_pkey PRIMARY KEY (id);


--
-- Name: market_listings market_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.market_listings
    ADD CONSTRAINT market_listings_pkey PRIMARY KEY (id);


--
-- Name: mining_challenges mining_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.mining_challenges
    ADD CONSTRAINT mining_challenges_pkey PRIMARY KEY (id);


--
-- Name: pass_code_logs pass_code_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.pass_code_logs
    ADD CONSTRAINT pass_code_logs_pkey PRIMARY KEY (id);


--
-- Name: stroom_sessions stroom_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.stroom_sessions
    ADD CONSTRAINT stroom_sessions_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_passes user_passes_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.user_passes
    ADD CONSTRAINT user_passes_pkey PRIMARY KEY (id);


--
-- Name: usernames usernames_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.usernames
    ADD CONSTRAINT usernames_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vault_stakes vault_stakes_pkey; Type: CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.vault_stakes
    ADD CONSTRAINT vault_stakes_pkey PRIMARY KEY (id);


--
-- Name: achievements_type_key; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE UNIQUE INDEX achievements_type_key ON public.achievements USING btree (type);


--
-- Name: activity_events_created_at_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX activity_events_created_at_idx ON public.activity_events USING btree (created_at);


--
-- Name: case_openings_case_id_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX case_openings_case_id_idx ON public.case_openings USING btree (case_id);


--
-- Name: case_openings_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX case_openings_user_id_created_at_idx ON public.case_openings USING btree (user_id, created_at);


--
-- Name: giveaway_entries_giveaway_id_user_id_key; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE UNIQUE INDEX giveaway_entries_giveaway_id_user_id_key ON public.giveaway_entries USING btree (giveaway_id, user_id);


--
-- Name: market_bids_bidder_id_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX market_bids_bidder_id_idx ON public.market_bids USING btree (bidder_id);


--
-- Name: market_bids_listing_id_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX market_bids_listing_id_idx ON public.market_bids USING btree (listing_id);


--
-- Name: market_listings_ends_at_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX market_listings_ends_at_idx ON public.market_listings USING btree (ends_at);


--
-- Name: market_listings_st_due_at_st_paid_at_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX market_listings_st_due_at_st_paid_at_idx ON public.market_listings USING btree (st_due_at, st_paid_at);


--
-- Name: market_listings_status_type_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX market_listings_status_type_idx ON public.market_listings USING btree (status, type);


--
-- Name: market_listings_username_id_key; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE UNIQUE INDEX market_listings_username_id_key ON public.market_listings USING btree (username_id);


--
-- Name: mining_challenges_expires_at_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX mining_challenges_expires_at_idx ON public.mining_challenges USING btree (expires_at);


--
-- Name: mining_challenges_user_id_status_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX mining_challenges_user_id_status_idx ON public.mining_challenges USING btree (user_id, status);


--
-- Name: pass_code_logs_created_at_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX pass_code_logs_created_at_idx ON public.pass_code_logs USING btree (created_at);


--
-- Name: stroom_sessions_user_id_expires_at_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX stroom_sessions_user_id_expires_at_idx ON public.stroom_sessions USING btree (user_id, expires_at);


--
-- Name: teachers_name_key; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE UNIQUE INDEX teachers_name_key ON public.teachers USING btree (name);


--
-- Name: transactions_receiver_id_created_at_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX transactions_receiver_id_created_at_idx ON public.transactions USING btree (receiver_id, created_at);


--
-- Name: transactions_sender_id_created_at_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX transactions_sender_id_created_at_idx ON public.transactions USING btree (sender_id, created_at);


--
-- Name: transactions_type_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX transactions_type_idx ON public.transactions USING btree (type);


--
-- Name: user_achievements_user_id_achievement_id_key; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE UNIQUE INDEX user_achievements_user_id_achievement_id_key ON public.user_achievements USING btree (user_id, achievement_id);


--
-- Name: user_passes_user_id_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX user_passes_user_id_idx ON public.user_passes USING btree (user_id);


--
-- Name: usernames_handle_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX usernames_handle_idx ON public.usernames USING btree (handle);


--
-- Name: usernames_handle_key; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE UNIQUE INDEX usernames_handle_key ON public.usernames USING btree (handle);


--
-- Name: usernames_owner_id_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX usernames_owner_id_idx ON public.usernames USING btree (owner_id);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: users_wallet_address_key; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE UNIQUE INDEX users_wallet_address_key ON public.users USING btree (wallet_address);


--
-- Name: vault_stakes_unlocks_at_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX vault_stakes_unlocks_at_idx ON public.vault_stakes USING btree (unlocks_at);


--
-- Name: vault_stakes_user_id_status_idx; Type: INDEX; Schema: public; Owner: stpoints
--

CREATE INDEX vault_stakes_user_id_status_idx ON public.vault_stakes USING btree (user_id, status);


--
-- Name: case_items case_items_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.case_items
    ADD CONSTRAINT case_items_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: case_openings case_openings_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.case_openings
    ADD CONSTRAINT case_openings_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: case_openings case_openings_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.case_openings
    ADD CONSTRAINT case_openings_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.case_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: case_openings case_openings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.case_openings
    ADD CONSTRAINT case_openings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: giveaway_entries giveaway_entries_giveaway_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.giveaway_entries
    ADD CONSTRAINT giveaway_entries_giveaway_id_fkey FOREIGN KEY (giveaway_id) REFERENCES public.giveaways(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: giveaway_entries giveaway_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.giveaway_entries
    ADD CONSTRAINT giveaway_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: giveaway_winners giveaway_winners_giveaway_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.giveaway_winners
    ADD CONSTRAINT giveaway_winners_giveaway_id_fkey FOREIGN KEY (giveaway_id) REFERENCES public.giveaways(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: giveaway_winners giveaway_winners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.giveaway_winners
    ADD CONSTRAINT giveaway_winners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: giveaways giveaways_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.giveaways
    ADD CONSTRAINT giveaways_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: market_bids market_bids_bidder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.market_bids
    ADD CONSTRAINT market_bids_bidder_id_fkey FOREIGN KEY (bidder_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: market_bids market_bids_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.market_bids
    ADD CONSTRAINT market_bids_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.market_listings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: market_listings market_listings_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.market_listings
    ADD CONSTRAINT market_listings_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: market_listings market_listings_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.market_listings
    ADD CONSTRAINT market_listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: market_listings market_listings_username_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.market_listings
    ADD CONSTRAINT market_listings_username_id_fkey FOREIGN KEY (username_id) REFERENCES public.usernames(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mining_challenges mining_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.mining_challenges
    ADD CONSTRAINT mining_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stroom_sessions stroom_sessions_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.stroom_sessions
    ADD CONSTRAINT stroom_sessions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stroom_sessions stroom_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.stroom_sessions
    ADD CONSTRAINT stroom_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: transactions transactions_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: transactions transactions_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_passes user_passes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.user_passes
    ADD CONSTRAINT user_passes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usernames usernames_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.usernames
    ADD CONSTRAINT usernames_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vault_stakes vault_stakes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: stpoints
--

ALTER TABLE ONLY public.vault_stakes
    ADD CONSTRAINT vault_stakes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: stpoints
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict z6G9M8ElbUY5kiyifY3sT4l5cL5WmA49Zbr6fImaf6Xeob7KMxEsIFees2RAqhq

