-- Increase the fact bank and alternate a second, distinct set of deduction puzzles.
-- Challenge IDs, dates, attempts, and saved scores are unchanged.
do $upgrade$
declare
  v_definition text;
  v_fact_old text := $old$
    'Inson irsiy axborotining asosiy molekulasi qaysi?|DNK|Glyukoza|Kraxmal|Gemoglobin'
  ];$old$;
  v_fact_new text := $new$
    'Inson irsiy axborotining asosiy molekulasi qaysi?|DNK|Glyukoza|Kraxmal|Gemoglobin',
    'Kuchning SI tizimidagi birligi qaysi?|Nyuton|Joul|Vatt|Paskal',
    'Insulin gormonini asosan qaysi aʼzo ishlab chiqaradi?|Oshqozon osti bezi|Jigar|Buyrak|Taloq',
    '25 °C dagi neytral suvning pH qiymati qancha?|7|0|5|14',
    'Yer yuzidagi eng katta qitʼa qaysi?|Osiyo|Afrika|Shimoliy Amerika|Yevropa',
    'Fe kimyoviy belgisi qaysi elementga tegishli?|Temir|Ftor|Fosfor|Mis',
    'Tovush qaysi muhitda tarqalmaydi?|Vakuumda|Suvda|Havoda|Poʻlatda',
    'Atmosfera bosimini oʻlchaydigan asbob qaysi?|Barometr|Termometr|Gigrometr|Ampermetr',
    'Yerga eng yaqin yulduz qaysi?|Quyosh|Sirius|Vega|Qutb yulduzi',
    'Fotosintez jarayonida oʻsimliklar qaysi gazni ajratadi?|Kislorod|Azot|Metan|Vodorod',
    'Dunyodagi eng yirik sutemizuvchi qaysi?|Koʻk kit|Afrika fili|Jirafa|Oq akula',
    'Yerda fasllar almashishining asosiy sababi nima?|Yer oʻqining qiyaligi|Yerning Quyoshdan uzoqligi|Oyning tortish kuchi|Quyosh haroratining oʻzgarishi',
    'URL qisqartmasi nimani anglatadi?|Uniform Resource Locator|Universal Reading Link|User Route List|Unified Remote Login',
    'Atmosferadagi ozon qatlamining asosiy qismi qaysi qatlamda?|Stratosferada|Troposferada|Mezosferada|Termosferada',
    'Halqalari bilan mashhur sayyora qaysi?|Saturn|Mars|Merkuriy|Yer',
    'Quyidagi sonlardan qaysi biri tub son?|29|21|27|33',
    'Teri quyosh nuri taʼsirida qaysi vitaminni hosil qilishda qatnashadi?|D vitamini|C vitamini|B12 vitamini|K vitamini',
    'Voyaga yetgan inson skeletida odatda nechta suyak boʻladi?|206|186|226|246',
    'Afrika va Avstraliya oraligʻida qaysi okean joylashgan?|Hind okeani|Atlantika okeani|Shimoliy Muz okeani|Tinch okeani',
    'Standart bosimda suv taxminan necha °C da muzlaydi?|0|−10|10|32',
    'DNKda adenin odatda qaysi asos bilan juftlashadi?|Timin|Guanin|Sitozin|Uratsil'
  ];$new$;
  v_logic_old text := $old$
    elsif v_mode = 1 then
      v_correct := v_logic_correct[v_stage];
      v_decoys := array[v_logic_d1[v_stage], v_logic_d2[v_stage], v_logic_d3[v_stage]];
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','choice','prompt',v_logic_prompts[v_stage],'options',v_options,
        'explanation','Shartlarni alohida tekshiring: toʻgʻri javob berilgan maʼlumotdan majburiy kelib chiqishi kerak.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));
$old$;
  v_logic_new text := $new$
    elsif v_mode = 1 then
      if mod(v_variant, 2) = 0 then
        v_prompt := v_logic_prompts[v_stage];
        v_correct := v_logic_correct[v_stage];
        v_decoys := array[v_logic_d1[v_stage], v_logic_d2[v_stage], v_logic_d3[v_stage]];
      else
        case v_stage
          when 1 then
            v_prompt := 'Barcha laboratoriya mudirlari xavfsizlik kursini oʻtgan. Aziza laboratoriya mudiri. Qaysi xulosa aniq?';
            v_correct := 'Aziza xavfsizlik kursini oʻtgan.';
            v_decoys := array['Kursni oʻtganlarning hammasi laboratoriya mudiri.','Aziza kursni oʻtmagan.','Aziza faqat nazoratchi.'];
          when 2 then
            v_prompt := 'Agar loyiha muddati oʻtgan boʻlsa, tizim ogohlantirish yuboradi. Ogohlantirish kelmadi. Nimani xulosa qilish mumkin?';
            v_correct := 'Loyiha muddati oʻtmagan.';
            v_decoys := array['Loyiha topshirilgan.','Tizim ishlamayapti.','Loyiha muddati oʻtgan.'];
          when 3 then
            v_prompt := 'Diyor Kamoladan oldin, Kamola Otabekdan oldin taqdimot qiladi. Oxirgi boʻlib kim chiqadi?';
            v_correct := 'Otabek.';
            v_decoys := array['Diyor.','Kamola.','Aniqlab boʻlmaydi.'];
          when 4 then
            v_prompt := 'Kalit A, B yoki C qutida. A yozuvi: “Kalit B da.” B yozuvi: “Kalit C da.” C yozuvi: “Kalit B da emas.” Aynan ikkita yozuv rost. Kalit qaysi qutida?';
            v_correct := 'C qutida.';
            v_decoys := array['A qutida.','B qutida.','Shartlar bilan aniqlab boʻlmaydi.'];
          else
            v_prompt := 'Agar printerda qogʻoz tugasa, sariq chiroq yonadi. Sariq chiroq yondi. Qaysi xulosa aniq?';
            v_correct := 'Qogʻoz tugaganini aniq aytib boʻlmaydi.';
            v_decoys := array['Qogʻoz albatta tugagan.','Printer albatta nosoz.','Qogʻoz yetarli ekani aniq.'];
        end case;
      end if;
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','choice','prompt',v_prompt,'options',v_options,
        'explanation','Shartlarni alohida tekshiring: toʻgʻri javob berilgan maʼlumotdan majburiy kelib chiqishi kerak.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));
$new$;
  v_fact_index_old text := 'v_fact_index := (v_stage - 1) * 4 + mod(v_variant, 4) + 1;';
  v_fact_index_new text := 'v_fact_index := (v_stage - 1) * 8 + mod(v_variant, 8) + 1;';
begin
  select pg_get_functiondef('public.daily_arena_build_challenge(date)'::regprocedure)
    into v_definition;

  if position(v_fact_old in v_definition) = 0
     or position(v_logic_old in v_definition) = 0
     or position(v_fact_index_old in v_definition) = 0 then
    raise exception 'Arena content migration could not find the expected function definition; no changes applied.';
  end if;

  v_definition := replace(v_definition, v_fact_old, v_fact_new);
  v_definition := replace(v_definition, v_logic_old, v_logic_new);
  v_definition := replace(v_definition, v_fact_index_old, v_fact_index_new);
  execute v_definition;
end
$upgrade$;

