import type { NextStep, PathNode } from './db.ts'

// The seeded "Migration Processes" example path, derived from the LIFE Initiative
// step-by-step Bürokratie guides (https://life-initiative.org/buerokratie-guidelines/).
// Content is authored in English (fallback) plus Ukrainian (uk) and Turkish (tr);
// the seed is written in the user's chosen language when the path is first opened.

type Lang = 'en' | 'uk' | 'tr'
type Text = Record<Lang, string>

type SeedStep = {
  text: Text
  dueDate?: string
  formLinks?: { label: string; url: string }[]
}

type SeedNode = {
  status: 'done' | 'active'
  title: Text
  translation: Text
  nextSteps: SeedStep[]
}

const LIFE = {
  asyl: { label: 'LIFE: Asylum procedure', url: 'https://life-initiative.org/asylverfahren/' },
  sozial: { label: 'LIFE: Social benefits', url: 'https://life-initiative.org/sozialleistungen/' },
  arbeit: { label: 'LIFE: Work permit', url: 'https://life-initiative.org/arbeitserlaubnis/' },
}
const NBG = {
  aufenthalt: {
    label: 'Nürnberg: Residence permit',
    url: 'https://www.nuernberg.de/internet/stadtportal/behoerdenwegweiser/dienstleistung/aufenthaltserlaubnis_humanitaer_asyl.html',
  },
  anerkennung: {
    label: 'Nürnberg: Recognition of degree',
    url: 'https://www.nuernberg.de/internet/stadtportal/behoerdenwegweiser/dienstleistung/anerkennung_eines_im_ausland_erworbenen_hochschulabschlusses.html',
  },
}

// All steps but the last are `done`; the last (recognition of the qualification —
// the app's core theme) is the `active` current step, which also demonstrates the
// mark-done → upload flow.
const SEED: SeedNode[] = [
  {
    status: 'done',
    title: {
      en: 'Arrival & registration',
      uk: 'Прибуття та реєстрація',
      tr: 'Varış ve kayıt',
    },
    translation: {
      en: 'This confirms your arrival in Germany and your registration at the reception centre. You have been assigned to a city and given an arrival certificate (Ankunftsnachweis).',
      uk: 'Це підтверджує ваше прибуття до Німеччини та реєстрацію в центрі прийому. Вас направлено до міста та видано довідку про прибуття (Ankunftsnachweis).',
      tr: "Bu belge, Almanya'ya varışınızı ve kabul merkezindeki kaydınızı onaylar. Bir şehre yerleştirildiniz ve size bir varış belgesi (Ankunftsnachweis) verildi.",
    },
    nextSteps: [
      {
        text: {
          en: 'Keep your arrival certificate (Ankunftsnachweis) safe — you need it for every appointment.',
          uk: 'Зберігайте довідку про прибуття (Ankunftsnachweis) — вона потрібна на кожній зустрічі.',
          tr: 'Varış belgenizi (Ankunftsnachweis) güvenli bir yerde saklayın — her randevuda gerekir.',
        },
      },
      {
        text: {
          en: 'Note the address of the accommodation you were assigned to.',
          uk: 'Запишіть адресу житла, до якого вас направили.',
          tr: 'Size tahsis edilen konaklama yerinin adresini not edin.',
        },
      },
    ],
  },
  {
    status: 'done',
    title: {
      en: 'Prepare for your asylum interview',
      uk: 'Підготовка до співбесіди про притулок',
      tr: 'İltica görüşmesine hazırlık',
    },
    translation: {
      en: 'You have been invited to your asylum interview (Anhörung) at the BAMF. This is the most important appointment in your asylum procedure.',
      uk: 'Вас запросили на співбесіду у справі про надання притулку (Anhörung) до BAMF. Це найважливіша зустріч у вашій процедурі надання притулку.',
      tr: "BAMF'de iltica görüşmenize (Anhörung) davet edildiniz. Bu, iltica sürecinizdeki en önemli randevudur.",
    },
    nextSteps: [
      {
        text: {
          en: 'Prepare a clear account of why you left your country, and bring all documents and evidence.',
          uk: 'Підготуйте чітку розповідь про те, чому ви залишили свою країну, і візьміть усі документи та докази.',
          tr: 'Ülkenizden neden ayrıldığınızı açıkça anlatmaya hazırlanın ve tüm belge ve kanıtları getirin.',
        },
        formLinks: [LIFE.asyl],
      },
      {
        text: {
          en: 'Ask for an interpreter in your language if you need one.',
          uk: 'Попросіть перекладача вашою мовою, якщо він вам потрібен.',
          tr: 'İhtiyacınız varsa kendi dilinizde bir tercüman isteyin.',
        },
      },
    ],
  },
  {
    status: 'done',
    title: {
      en: 'Residence permit (Ausländerbehörde)',
      uk: 'Дозвіл на проживання (Ausländerbehörde)',
      tr: 'Oturma izni (Ausländerbehörde)',
    },
    translation: {
      en: "Your right to stay is handled by the Ausländerbehörde (foreigners' office). This letter concerns your residence permit and your appointments there.",
      uk: 'Ваше право на перебування вирішує Ausländerbehörde (відомство у справах іноземців). Цей лист стосується вашого дозволу на проживання та зустрічей там.',
      tr: "Kalma hakkınız Ausländerbehörde (Yabancılar Dairesi) tarafından yürütülür. Bu mektup, oturma izninizle ve oradaki randevularınızla ilgilidir.",
    },
    nextSteps: [
      {
        text: {
          en: 'Attend your appointment at the Ausländerbehörde on time.',
          uk: 'Приходьте на зустріч до Ausländerbehörde вчасно.',
          tr: "Yabancılar Dairesi'ndeki randevunuza zamanında gidin.",
        },
        formLinks: [NBG.aufenthalt],
      },
      {
        text: {
          en: 'Bring your passport, biometric photos and this letter.',
          uk: 'Візьміть паспорт, біометричні фотографії та цей лист.',
          tr: 'Pasaportunuzu, biyometrik fotoğraflarınızı ve bu mektubu getirin.',
        },
      },
    ],
  },
  {
    status: 'done',
    title: {
      en: 'Address registration & benefits',
      uk: 'Реєстрація адреси та допомога',
      tr: 'Adres kaydı ve yardımlar',
    },
    translation: {
      en: 'To live in Germany you must register your address (Anmeldung) at the Bürgeramt. If you are eligible, you can also apply for social benefits (Sozialleistungen).',
      uk: 'Щоб жити в Німеччині, ви повинні зареєструвати адресу (Anmeldung) у Bürgeramt. Якщо ви маєте право, ви також можете подати заяву на соціальну допомогу (Sozialleistungen).',
      tr: "Almanya'da yaşamak için adresinizi Bürgeramt'ta kaydettirmeniz (Anmeldung) gerekir. Hak sahibiyseniz sosyal yardımlar (Sozialleistungen) için de başvurabilirsiniz.",
    },
    nextSteps: [
      {
        text: {
          en: 'Register your address at the Bürgeramt within two weeks of moving in.',
          uk: 'Зареєструйте свою адресу в Bürgeramt протягом двох тижнів після заселення.',
          tr: "Taşındıktan sonra iki hafta içinde adresinizi Bürgeramt'ta kaydettirin.",
        },
      },
      {
        text: {
          en: 'Apply for social benefits if you have little or no income.',
          uk: 'Подайте заяву на соціальну допомогу, якщо у вас малий дохід або його немає.',
          tr: 'Geliriniz az veya hiç yoksa sosyal yardım için başvurun.',
        },
        formLinks: [LIFE.sozial],
      },
    ],
  },
  {
    status: 'done',
    title: {
      en: 'Work permit',
      uk: 'Дозвіл на роботу',
      tr: 'Çalışma izni',
    },
    translation: {
      en: 'Before you can start a job you may need a work permit (Arbeitserlaubnis). Whether and how you may work depends on your residence status.',
      uk: 'Перш ніж почати роботу, вам може знадобитися дозвіл на роботу (Arbeitserlaubnis). Чи можете ви працювати і як саме, залежить від вашого статусу перебування.',
      tr: 'Bir işe başlamadan önce çalışma iznine (Arbeitserlaubnis) ihtiyacınız olabilir. Çalışıp çalışamayacağınız ve nasıl çalışacağınız oturma durumunuza bağlıdır.',
    },
    nextSteps: [
      {
        text: {
          en: 'Check whether your residence document already allows you to work.',
          uk: 'Перевірте, чи ваш документ про перебування вже дозволяє вам працювати.',
          tr: 'Oturma belgenizin çalışmanıza zaten izin verip vermediğini kontrol edin.',
        },
      },
      {
        text: {
          en: 'If a permit is needed, apply for it at the Ausländerbehörde.',
          uk: 'Якщо потрібен дозвіл, подайте заяву на нього до Ausländerbehörde.',
          tr: "İzin gerekiyorsa Yabancılar Dairesi'ne başvurun.",
        },
        formLinks: [LIFE.arbeit],
      },
    ],
  },
  {
    status: 'active',
    title: {
      en: 'Recognition of your qualification',
      uk: 'Визнання вашої кваліфікації',
      tr: 'Diplomanızın denkliği',
    },
    translation: {
      en: 'To work in your profession in Germany, your foreign qualification usually has to be officially recognised (Anerkennung). This is the current step on your path.',
      uk: 'Щоб працювати за своєю професією в Німеччині, вашу іноземну кваліфікацію зазвичай потрібно офіційно визнати (Anerkennung). Це поточний крок на вашому шляху.',
      tr: 'Almanya\'da mesleğinizi yapabilmek için yabancı diplomanızın genellikle resmî olarak denkliğinin (Anerkennung) alınması gerekir. Bu, yolunuzdaki güncel adımdır.',
    },
    nextSteps: [
      {
        text: {
          en: 'Find the recognition office responsible for your profession.',
          uk: 'Знайдіть орган визнання, відповідальний за вашу професію.',
          tr: 'Mesleğinizden sorumlu denklik kurumunu bulun.',
        },
        dueDate: '2026-08-14',
        formLinks: [NBG.anerkennung],
      },
      {
        text: {
          en: 'Collect certified copies and translations of your diplomas and certificates.',
          uk: 'Зберіть завірені копії та переклади ваших дипломів і свідоцтв.',
          tr: 'Diploma ve sertifikalarınızın onaylı kopyalarını ve çevirilerini toplayın.',
        },
      },
    ],
  },
]

function pick(text: Text, lang: Lang): string {
  return text[lang] ?? text.en
}

/** The seed path in the given language (unknown languages fall back to English). */
export function buildSeed(
  lang: string,
): { status: PathNode['status']; title: string; translation: string; nextSteps: NextStep[] }[] {
  const l: Lang = lang === 'uk' || lang === 'tr' ? lang : 'en'
  return SEED.map((node) => ({
    status: node.status,
    title: pick(node.title, l),
    translation: pick(node.translation, l),
    nextSteps: node.nextSteps.map((step) => ({
      text: pick(step.text, l),
      ...(step.dueDate ? { dueDate: step.dueDate } : {}),
      ...(step.formLinks ? { formLinks: step.formLinks } : {}),
    })),
  }))
}
