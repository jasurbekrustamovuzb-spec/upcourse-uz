-- Add a rollout boundary so older saved scores keep their original game-mode classification.
create table if not exists public.daily_arena_config (
  id boolean primary key default true check (id),
  extended_modes_from date not null
);
insert into public.daily_arena_config(id, extended_modes_from)
values (true, (now() at time zone 'Asia/Tashkent')::date + 1)
on conflict (id) do nothing;
alter table public.daily_arena_config enable row level security;
revoke all on table public.daily_arena_config from anon, authenticated;

create or replace function public.daily_arena_build_challenge(p_date date)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_day integer := greatest((p_date - date '2026-09-30'), 0);
  v_mode integer;
  v_mode_day integer;
  v_rollout date;
  v_variant integer;
  v_a integer;
  v_b integer;
  v_c integer;
  v_cipher_code text;
  v_cipher_value integer;
  v_attention_slot integer;
  v_visual_count integer;
  v_fact_parts text[];
  v_fact_index integer;
  v_fact_bank text[] := array[
    'Bir bayt odatda necha bitdan iborat?|8|4|16|2',
    'Quyosh tizimidagi eng katta sayyora qaysi?|Yupiter|Saturn|Yer|Mars',
    'Yaponiyaning pul birligi qaysi?|Yen|Von|Yuan|Rupiy',
    'Yerning tabiiy yoʻldoshi qaysi?|Oy|Mars|Quyosh|Venera',
    'Uch tomoni bor geometrik shakl qaysi?|Uchburchak|Toʻrtburchak|Beshburchak|Doira',
    'Suvning kimyoviy formulasi qaysi?|H2O|CO2|O2|NaCl',
    'Qizil sayyora deb qaysi sayyora ataladi?|Mars|Venera|Merkuriy|Neptun',
    'Yaponiyaning poytaxti qaysi shahar?|Tokio|Kioto|Osaka|Nagoya',
    'Odam yuragida nechta kamera bor?|4|2|3|5',
    'Yer atmosferasida eng koʻp uchraydigan gaz qaysi?|Azot|Kislorod|Karbonat angidrid|Vodorod',
    'Dunyodagi eng katta okean qaysi?|Tinch okeani|Atlantika okeani|Hind okeani|Shimoliy Muz okeani',
    'Fotosintezda oʻsimliklar asosan qaysi gazni yutadi?|Karbonat angidrid|Kislorod|Azot|Vodorod',
    'Yer yuzidagi eng katta choʻl qaysi?|Antarktida|Sahroi Kabir|Gobi|Arabiston choʻli',
    'Yorugʻlik vakuumda taxminan qanday tezlikda tarqaladi?|300 000 km/s|30 000 km/s|3 000 km/s|3 000 000 km/s',
    'Braziliyaning poytaxti qaysi shahar?|Brazilia|Rio-de-Janeyro|San-Paulu|Salvador',
    'Dengiz sathida suv taxminan necha °C da qaynaydi?|100|90|80|120',
    'Geometriyada 90° burchak qanday ataladi?|Toʻgʻri burchak|Oʻtkir burchak|Oʻtmas burchak|Yoyiq burchak',
    'Yer Quyosh atrofini taxminan qancha vaqtda bir marta aylanadi?|365 kun|30 kun|24 soat|12 soat',
    'Kompyuterning markaziy hisoblash qurilmasi qisqartmasi qaysi?|CPU|RAM|URL|GPU',
    'Inson irsiy axborotining asosiy molekulasi qaysi?|DNK|Glyukoza|Kraxmal|Gemoglobin'
  ];
  v_title text;
  v_subtitle text;
  v_rounds jsonb := '[]'::jsonb;
  v_answers jsonb := '[]'::jsonb;
  v_stage integer;
  v_k integer;
  v_offset integer;
  v_correct_position integer;
  v_start integer;
  v_step integer;
  v_answer integer;
  v_terms integer[];
  v_term_text text;
  v_correct text;
  v_decoys text[];
  v_options jsonb;
  v_prompt text;
  v_explanation text;
  v_word text;
  v_words text[];
  v_symbols text[] := array['●','▲','■','◆','★','⬟','⬢','✚','⬣','◉'];
  v_visual jsonb;
  v_symbol_index integer;
  v_left text[];
  v_right text[];
  v_right_display text[];
  v_match_code text;
  v_display_index integer;
  v_logic_prompts text[] := array[
    'Barcha arxivchilar tartibli. Malika arxivchi. Qaysi xulosa shartlardan kelib chiqadi?',
    'Agar signal yoqilgan boʻlsa, chiroq yonadi. Chiroq yonmayapti. Nimani aniq xulosa qilish mumkin?',
    'Uch kishi — Vali, Ali va Zuhra — bittadan navbat bilan chiqadi. Vali Alidan oldin, Zuhra Alidan keyin chiqadi. Birinchi boʻlib kim chiqadi?',
    'Kalit A, B yoki C qutida. A yozuvi: “Kalit A da emas.” B yozuvi: “Kalit A da.” C yozuvi: “Kalit C da emas.” Yozuvlardan aynan bittasi rost. Kalit qaysi qutida?',
    'A, B, C navbat bilan chiqadi. A B dan oldin, C A dan keyin va B dan oldin. Qaysi tartib ikkala shartga ham mos?'
  ];
  v_logic_correct text[] := array[
    'Malika tartibli.',
    'Signal yoqilmagan.',
    'Vali.',
    'C qutida.',
    'A, C, B.'
  ];
  v_logic_d1 text[] := array[
    'Barcha tartibli odamlar arxivchi.',
    'Signal albatta yoqilgan.',
    'Ali.',
    'A qutida.',
    'B, A, C.'
  ];
  v_logic_d2 text[] := array[
    'Malika arxivchi emas.',
    'Chiroq buzilganini aniq bilamiz.',
    'Ali va Vali.',
    'B qutida.',
    'C, A, B.'
  ];
  v_logic_d3 text[] := array[
    'Malika ham arxivchi, ham tartibli emas.',
    'Signal yoqilgan, ammo chiroq ishlamayapti.',
    'Ali ham, Vali ham emas.',
    'Aniqlab boʻlmaydi.',
    'A, B, C.'
  ];
begin
  select extended_modes_from into v_rollout
    from public.daily_arena_config where id = true;
  if v_rollout is not null and p_date >= v_rollout then
    v_mode_day := p_date - v_rollout;
    v_mode := mod(v_mode_day, 9);
    v_variant := v_mode_day / 9;
  else
    -- Old kunlardagi progressni yangi tartibda qayta tasniflamaymiz.
    v_mode := mod(v_day, 5);
    v_variant := v_day / 5;
  end if;
  case v_mode
    when 0 then v_title := 'Naqsh laboratoriyasi'; v_subtitle := 'Ketma-ketlik ortidagi qoidani toping. Bosqichlar asta-sekin murakkablashadi.';
    when 1 then v_title := 'Deduksiya xonasi'; v_subtitle := 'Berilgan dalillardan faqat aniq kelib chiqadigan xulosani tanlang.';
    when 2 then v_title := 'Harflar aralashmasi'; v_subtitle := 'Aralashgan harflardan soʻzni toping. Har bosqichda soʻz murakkablashadi.';
    when 3 then v_title := 'Vizual signal'; v_subtitle := 'Belgilar tartibini kuzating va naqshning keyingi qismini toping.';
    when 4 then v_title := 'Moslik sinovi'; v_subtitle := 'Chap va oʻng tomondagi tushunchalarni mantiqan juftlang.';
    when 5 then v_title := 'Tez hisob'; v_subtitle := 'Bosh qotirmasdan hisoblang: bosqichlar asta-sekin murakkablashadi.';
    when 6 then v_title := 'Faktlar maydoni'; v_subtitle := 'Ilm-fan va kundalik bilimlardan aniq javobni tanlang.';
    when 7 then v_title := 'Raqamli shifr'; v_subtitle := 'Harflarning alifbodagi tartib raqamini oching.';
    else v_title := 'Diqqat sinovi'; v_subtitle := 'Belgilar orasidagi yagona farqni tez ilgʻang.';
  end case;

  for v_stage in 1..5 loop
    v_offset := mod(v_day + v_stage * 3, 4);
    v_correct_position := mod(4 - v_offset, 4);
    if v_mode = 0 then
      v_start := 3 + mod(v_variant + v_stage * 2, 11);
      v_step := 2 + mod(v_variant + v_stage, 5);
      v_terms := array[]::integer[];
      for v_k in 0..4 loop
        if v_stage = 1 then
          v_terms := array_append(v_terms, v_start + v_k * v_step);
        elsif v_stage = 2 then
          v_terms := array_append(v_terms, v_start + v_k * (v_k + 1));
        elsif v_stage = 3 then
          v_terms := array_append(v_terms, v_start * (2 ^ v_k));
        elsif v_stage = 4 then
          v_terms := array_append(v_terms, v_start + v_step * v_k * v_k + v_k);
        else
          if v_k = 0 then v_terms := array_append(v_terms, v_start);
          elsif v_k = 1 then v_terms := array_append(v_terms, v_start + v_step);
          else v_terms := array_append(v_terms, v_terms[v_k] + v_terms[v_k - 1]);
          end if;
        end if;
      end loop;
      if v_stage = 1 then v_answer := v_start + 5 * v_step;
      elsif v_stage = 2 then v_answer := v_start + 30;
      elsif v_stage = 3 then v_answer := v_start * 32;
      elsif v_stage = 4 then v_answer := v_start + 25 * v_step + 5;
      else v_answer := v_terms[5] + v_terms[4];
      end if;
      select string_agg(value::text, ' · ' order by ordinality) into v_term_text
        from unnest(v_terms) with ordinality as t(value, ordinality);
      v_correct := v_answer::text;
      v_decoys := array[(v_answer + v_stage)::text, (v_answer - v_stage - 1)::text, (v_answer + 2 * v_stage + 3)::text];
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_prompt := 'Naqshni davom ettiring: ' || v_term_text || ' · ?';
      v_explanation := case v_stage
        when 1 then 'Har safar bir xil miqdor qoʻshiladi.'
        when 2 then 'Qoʻshilayotgan farqlar ketma-ket juft sonlar: 2, 4, 6, 8, 10.'
        when 3 then 'Har bir had avvalgisidan ikki baravar katta.'
        when 4 then 'Farqlar kvadratlar qoidasi boʻyicha ortadi.'
        else 'Har yangi had oldingi ikki hadning yigʻindisi.'
      end;
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','choice','prompt',v_prompt,'options',v_options,'explanation',v_explanation,'level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));

    elsif v_mode = 1 then
      v_correct := v_logic_correct[v_stage];
      v_decoys := array[v_logic_d1[v_stage], v_logic_d2[v_stage], v_logic_d3[v_stage]];
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','choice','prompt',v_logic_prompts[v_stage],'options',v_options,
        'explanation','Shartlarni alohida tekshiring: toʻgʻri javob berilgan maʼlumotdan majburiy kelib chiqishi kerak.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));

    elsif v_mode = 2 then
      case v_stage
        when 1 then v_words := array['kitob','qalam','daryo','meva','bulut'];
        when 2 then v_words := array['mantiq','fikrlar','tartib','sabab','dalil'];
        when 3 then v_words := array['tafakkur','ehtimol','muvozanat','xulosa','izlanish'];
        when 4 then v_words := array['tasavvur','munosabat','kuzatuv','qarorlar','tahlillar'];
        else v_words := array['muvaffaqiyat','mehnatsevar','mustaqillik','qonuniyat','muammolar'];
      end case;
      v_word := v_words[mod(v_variant + v_stage - 1, array_length(v_words,1)) + 1];
      v_correct := lower(v_word);
      v_prompt := 'Aralashgan harflar:  ' || public.daily_arena_scramble(v_word, v_variant + v_stage);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','text','prompt',v_prompt,'explanation','Harflarni oʻrniga qoʻyib, mazmunli soʻzni toping.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(v_correct);

    elsif v_mode = 3 then
      v_symbol_index := mod(v_day + v_stage, 10);
      v_step := v_stage;
      v_visual := '[]'::jsonb;
      for v_k in 0..4 loop
        v_visual := v_visual || jsonb_build_array(v_symbols[mod(v_symbol_index + v_k * v_step, 10) + 1]);
      end loop;
      v_correct := v_symbols[mod(v_symbol_index + 5 * v_step, 10) + 1];
      v_decoys := array[
        v_symbols[mod(v_symbol_index + 5 * v_step + 1,10)+1],
        v_symbols[mod(v_symbol_index + 5 * v_step + 3,10)+1],
        v_symbols[mod(v_symbol_index + 5 * v_step + 6,10)+1]
      ];
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','visual','prompt','Belgilar qatorida qaysi belgi keyingi keladi?','visual',v_visual,
        'options',v_options,'explanation','Ketma-ketlik har bosqichda bir xil qadam bilan siljiydi.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));

    elsif v_mode = 5 then
      if v_stage = 1 then
        v_a := 8 + mod(v_day * 3 + v_variant, 19);
        v_b := 5 + mod(v_day + 2 * v_variant, 14);
        v_answer := v_a + v_b;
        v_prompt := 'Hisoblang: ' || v_a || ' + ' || v_b || ' = ?';
      elsif v_stage = 2 then
        v_a := 46 + mod(v_day * 5 + v_variant, 45);
        v_b := 11 + mod(v_day * 3 + v_variant, 9);
        v_answer := v_a - v_b;
        v_prompt := 'Hisoblang: ' || v_a || ' − ' || v_b || ' = ?';
      elsif v_stage = 3 then
        v_a := 6 + mod(v_day + v_variant, 7);
        v_b := 7 + mod(v_day * 3 + v_variant, 8);
        v_answer := v_a * v_b;
        v_prompt := 'Hisoblang: ' || v_a || ' × ' || v_b || ' = ?';
      elsif v_stage = 4 then
        v_a := 3 + mod(v_day + v_variant, 6);
        v_b := 4 + mod(v_day * 2 + v_variant, 5);
        v_c := 2 + mod(v_day * 3 + v_variant, 4);
        v_answer := v_a + v_b * v_c;
        v_prompt := 'Amallar tartibiga rioya qiling: ' || v_a || ' + ' || v_b || ' × ' || v_c || ' = ?';
      else
        v_a := 50 + 25 * mod(v_day + v_variant, 7);
        v_answer := v_a / 4;
        v_prompt := v_a || ' ning 25 foizi qancha?';
      end if;
      v_correct := v_answer::text;
      v_decoys := array[(v_answer + 7)::text, (v_answer - 4)::text, (v_answer + 13)::text];
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','choice','prompt',v_prompt,'options',v_options,
        'explanation','Ifodadagi amallarni navbat bilan bajaring; koʻpaytirish qoʻshishdan oldin bajariladi.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));

    elsif v_mode = 6 then
      v_fact_index := (v_stage - 1) * 4 + mod(v_variant, 4) + 1;
      v_fact_parts := string_to_array(v_fact_bank[v_fact_index], '|');
      v_correct := v_fact_parts[2];
      v_decoys := array[v_fact_parts[3], v_fact_parts[4], v_fact_parts[5]];
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','choice','prompt',v_fact_parts[1],'options',v_options,
        'explanation','Aniq faktni eslang; taxmin emas, ishonchli bilimga tayaning.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));

    elsif v_mode = 7 then
      case v_stage
        when 1 then v_words := array['OY','SUV','OTA','ONA','TIL'];
        when 2 then v_words := array['BILIM','KITOB','SABAB','DALIL','VAQT'];
        when 3 then v_words := array['MANTIQ','TAFAKKUR','QAROR','KUZATUV','TARTIB'];
        when 4 then v_words := array['QONUNIYAT','MUNOSABAT','IZLANISH','MUVOZANAT','EHTIMOL'];
        else v_words := array['MUSTAQILLIK','MULOHAZAKOR','MURAKKABLIK','MUVAFFAQIYAT','TASHABBUSKOR'];
      end case;
      v_word := v_words[mod(v_variant + v_stage - 1, array_length(v_words, 1)) + 1];
      v_cipher_code := '';
      for v_k in 1..length(v_word) loop
        v_cipher_value := ascii(substring(v_word from v_k for 1)) - ascii('A') + 1;
        v_cipher_code := v_cipher_code || case when v_k > 1 then ' · ' else '' end || v_cipher_value::text;
      end loop;
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','text','prompt','Raqamli shifrni oching (A=1, B=2, …, Z=26): ' || v_cipher_code,
        'explanation','Har bir raqamni lotin alifbosidagi mos harfga almashtiring.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(lower(v_word));

    elsif v_mode = 8 then
      v_visual_count := 5 + v_stage;
      v_symbol_index := mod(v_day + v_variant + v_stage, 10);
      v_attention_slot := mod(v_day + v_variant * 2 + v_stage, v_visual_count);
      v_correct := v_symbols[mod(v_symbol_index + 5, 10) + 1];
      v_visual := '[]'::jsonb;
      for v_k in 0..(v_visual_count - 1) loop
        if v_k = v_attention_slot then
          v_visual := v_visual || jsonb_build_array(v_correct);
        else
          v_visual := v_visual || jsonb_build_array(v_symbols[v_symbol_index + 1]);
        end if;
      end loop;
      v_decoys := array[
        v_symbols[mod(v_symbol_index + 6, 10) + 1],
        v_symbols[mod(v_symbol_index + 7, 10) + 1],
        v_symbols[mod(v_symbol_index + 8, 10) + 1]
      ];
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','visual','prompt','Koʻpchilikdan farq qilayotgan yagona belgini toping.','visual',v_visual,
        'options',v_options,'explanation','Qatorni birma-bir skaner qiling: faqat bitta belgi boshqacha.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));

    else
      case v_stage
        when 1 then v_left := array['Italiya','Yaponiya','Misr','Kanada']; v_right := array['Ottava','Tokio','Rim','Qohira'];
        when 2 then v_left := array['km','kg','litr','sekund']; v_right := array['vaqt','hajm','massa','masofa'];
        when 3 then v_left := array['Kompas','Termometr','Barometr','Sekstant']; v_right := array['havo bosimi','yoʻnalish','harorat','burchak balandligi'];
        when 4 then v_left := array['Metafora','Ironiya','Paradoks','Analogiya']; v_right := array['oʻxshashlik asosidagi taqqos','zid koʻrinadigan haqiqat','yashirin kinoya','koʻchma maʼnoli ifoda'];
        else v_left := array['Korrelatsiya','Sababiyat','Namuna xatosi','Tasdiqlash ogʻishi']; v_right := array['faqat mos oʻzgarish birga kuzatilishi','qarshi dalilni eʼtiborsiz qoldirish','kichik guruhdan umumlashtirish','bir hodisa boshqasini yuzaga keltirishi'];
      end case;
      v_right_display := array[]::text[];
      v_match_code := '';
      for v_k in 1..4 loop
        v_display_index := mod(v_k - 1 + v_offset, 4) + 1;
        v_right_display := array_append(v_right_display, v_right[v_display_index]);
      end loop;
      for v_k in 1..4 loop
        v_display_index := mod(v_k - 1 - v_offset + 4, 4) + 1;
        v_match_code := v_match_code || v_display_index::text;
      end loop;
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','match','prompt','Har bir tushunchani mos taʼrif yoki javob bilan juftlang.',
        'left',to_jsonb(v_left),'right',to_jsonb(v_right_display),
        'explanation','Har bir juftni alohida tekshiring; bir javob faqat bir marta ishlatiladi.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(v_match_code);
    end if;
  end loop;

  return jsonb_build_object(
    'date',p_date,'mode',case v_mode when 0 then 'pattern' when 1 then 'logic' when 2 then 'word' when 3 then 'visual' when 4 then 'matching' when 5 then 'calculation' when 6 then 'fact' when 7 then 'cipher' else 'attention' end,
    'title',v_title,'subtitle',v_subtitle,'rounds',v_rounds,'answer_key',v_answers
  );
end
$$;
revoke all on function public.daily_arena_build_challenge(date) from public, anon, authenticated;
