/** English source strings are stable translation keys, shared by the UI and API.
 * User-authored resume fields and letter edits must never pass through this dictionary.
 */
const ru: Record<string, string> = {
  "Dismiss notification": "Закрыть уведомление",
  "Skip to content": "Перейти к содержимому",
  "Changes saved": "Изменения сохранены",
  "Resume updated": "Резюме обновлено",
  "Cover letter saved": "Письмо сохранено",
  "ai.busy": "Генерация уже выполняется. Дождитесь завершения.",
  "setup.required":
    "Не удалось подключить приложение. Проверьте настройки сервера и Supabase, затем повторите попытку.",
  "auth.required": "Войдите в аккаунт и подтвердите электронную почту.",
  "auth.failed":
    "Не удалось войти: неверная почта или пароль. Если вы регистрировались через Google, нажмите «Войти через Google».",
  "auth.signupCheckEmail":
    "Проверьте почту: мы отправили ссылку для подтверждения. Если письма нет, возможно, аккаунт с этим адресом уже существует — войдите (в том числе через Google) или восстановите пароль.",
  "Job source": "Источник вакансий",
  "All sources": "Все источники",
  "Not specified": "Не указано",
  "jobs.sampled":
    "Показана загруженная выборка, а не весь каталог сайтов. Удалённая работа может иметь ограничения по стране.",
  "source.ok": "Загружен",
  "source.notConfigured": "Нужен API-ключ",
  "source.unavailable": "Временно недоступен",
  "source.unsupportedFilters":
    "Пропущен: источник не предоставляет данные для выбранных фильтров",
  "jobs.notFound": "Вакансия больше не доступна. Обновите поиск.",
  "Live listings · Apply on the original site · AI assessments are advisory":
    "Актуальные вакансии · Отклик на сайте источника · Оценки ИИ носят рекомендательный характер",
  "Explore opportunities. Check experience and location requirements.":
    "Изучайте вакансии. Проверяйте требования к опыту и местоположению.",
  "jobs.accessDenied":
    "HeadHunter отклонил доступ к поиску вакансий. Администратору нужно настроить или проверить токен API HeadHunter.",
  "auth.googleDisabled":
    "Вход через Google ещё не настроен. Пока используйте электронную почту.",
  "auth.googleFailed":
    "Вход через Google отменён или завершился ошибкой. Попробуйте снова или войдите по почте.",
  "auth.timeout": "Сервис входа не ответил вовремя. Попробуйте снова.",
  "auth.checkEmail":
    "Если адрес подходит для этой операции, письмо с дальнейшими инструкциями будет отправлено.",
  "request.invalid": "Проверьте введённые данные.",
  "service.unavailable": "Сервис временно недоступен. Попробуйте позже.",
  "ai.failed":
    "ИИ не смог завершить ответ. Попробуйте позже; при повторении обратитесь к администратору.",
  "rate.limit": "Слишком много запросов. Попробуйте позже.",
  "resume.conflict":
    "Резюме изменилось в другой вкладке. Скопируйте свои правки и обновите страницу.",
  "chat.full":
    "Достигнут лимит диалога. Сохраните резюме и начните новый диалог.",
  "jobs.failed":
    "Не удалось получить вакансии от HeadHunter. Попробуйте позже.",
  Email: "Электронная почта",
  Password: "Пароль",
  "New password": "Новый пароль",
  "Create account": "Создать аккаунт",
  "Welcome back": "С возвращением",
  "Reset password": "Восстановить пароль",
  "Sign in": "Войти",
  "Sign out": "Выйти",
  "Save password": "Сохранить пароль",
  "Send reset link": "Отправить ссылку",
  "Continue with Google": "Войти через Google",
  "Please wait…": "Подождите…",
  "Loading account…": "Загрузка аккаунта…",
  "Your career workspace, securely saved.":
    "Ваш карьерный кабинет с безопасным хранением данных.",
  "AI features send your resume and chat to OpenAI when you use them. Do not include sensitive identifiers.":
    "При использовании функций ИИ резюме и сообщения отправляются в OpenAI. Не указывайте конфиденциальные идентификаторы.",
  "Connected workspace": "Личный кабинет",
  "Unsaved resume changes": "Есть несохранённые изменения резюме.",
  "Save changes": "Сохранить изменения",
  Saved: "Сохранено",
  "PDF template": "Шаблон PDF",
  Modern: "Современный",
  Classic: "Классический",
  "Download PDF": "Скачать PDF",
  "PDFs are saved privately in your account":
    "PDF сохраняется в закрытом хранилище аккаунта",
  Previous: "Назад",
  Next: "Далее",
  "Newest first": "Сначала новые",
  Experienced: "С опытом",
  "Work format": "Формат работы",
  "Any work format": "Любой формат",
  Onsite: "В офисе",
  "Role type": "Тип занятости",
  "Any role type": "Любая занятость",
  Contract: "Проектная работа",
  "Minimum salary": "Зарплата от",
  Currency: "Валюта",
  "Salary not listed": "Зарплата не указана",
  "Explore current opportunities and request an AI fit assessment.":
    "Посмотрите актуальные вакансии и запросите оценку соответствия у ИИ.",
  "Live HeadHunter listings · Apply on the original site · AI assessments are advisory":
    "Актуальные вакансии HeadHunter · Отклик на сайте источника · Оценки ИИ носят рекомендательный характер",
  "Live AI · Responses stream in real time":
    "ИИ · Ответы появляются в реальном времени",
  "Enter to send · Shift + Enter for a new line":
    "Enter — отправить · Shift + Enter — новая строка",
  "Clear resume and chat": "Очистить резюме и чат",
  "Clear the saved resume and chat? Your letters and saved jobs will remain.":
    "Очистить сохранённое резюме и чат? Письма и избранные вакансии останутся.",
  "Assess with AI": "Оценить с помощью ИИ",
  "Matching evidence": "Подходящий опыт",
  "Missing requirements": "Недостающие навыки",
  "View original listing": "Открыть вакансию у источника",
  "WorkFinder — Your next chapter": "workfinder. — твой следующий шаг",
  "WorkFinder — turn your potential into your next opportunity.":
    "workfinder. — преврати свой потенциал в новые возможности.",
  Language: "Язык",
  "Switch to Russian": "Переключить на русский",
  "Switch to English": "Switch to English",
  "Language preference could not be saved. It will apply only to this session.":
    "Не удалось сохранить язык. Выбор действует только в этой сессии.",
  Overview: "Обзор",
  "Resume assistant": "Помощник по резюме",
  "My resume": "Моё резюме",
  "Explore jobs": "Найти работу",
  "Saved jobs": "Избранное",
  "Close navigation": "Закрыть меню",
  "Open navigation": "Открыть меню",
  "Close navigation overlay": "Закрыть меню навигации",
  "YOUR WORKSPACE": "ЛИЧНЫЙ КАБИНЕТ",
  AI: "ИИ",
  "Big potential.": "Большие возможности.",
  "First steps.": "Первые шаги.",
  "You don’t need years of experience to get started.":
    "Чтобы начать, не нужны годы опыта.",
  "Let’s build your story": "Расскажем твою историю",
  "Your workspace": "Личный кабинет",
  "Student account · Local": "Профиль студента · Локально",
  Workspace: "Кабинет",
  "Competition demo": "Демо для конкурса",
  "Replace your resume and letters with the sample profile?":
    "Заменить резюме и письма данными из примера?",
  "Clear your resume, chat, and generated letters from this browser?":
    "Удалить резюме, переписку и созданные письма из этого браузера?",
  "Saved jobs will stay.": "Избранные вакансии сохранятся.",
  "Confirm replacement": "Подтвердить замену",
  "Confirm reset": "Подтвердить сброс",
  Cancel: "Отмена",
  "YOUR NEXT CHAPTER STARTS HERE": "ТВОЙ СЛЕДУЮЩИЙ ШАГ НАЧИНАЕТСЯ ЗДЕСЬ",
  "Make room for what’s next": "Откройся новым возможностям",
  "Your skills. Your ambitions. A little help finding your way.":
    "Твои навыки. Твои цели. Наша помощь на пути к работе.",
  "Try a sample profile": "Попробовать пример",
  "BUILT FOR YOUR BEGINNING": "ДЛЯ УВЕРЕННОГО СТАРТА",
  "You have potential.": "У тебя есть потенциал.",
  "Let’s put it to work.": "Пора его раскрыть.",
  "Turn your experiences into a standout resume,":
    "Создай резюме на основе своего опыта,",
  "discover your fit, and take the first step.":
    "найди подходящую работу и сделай первый шаг.",
  "Continue your resume": "Продолжить резюме",
  "Build my first resume": "Создать первое резюме",
  "No experience? No problem.": "Нет опыта? Это не проблема.",
  "Your story, polished": "Твой опыт — в лучшем свете",
  "One conversation away": "Всего один разговор",
  "YOUR NEXT CHAPTER": "ТВОЙ СЛЕДУЮЩИЙ ШАГ",
  "THE SKILLS YOU BRING": "ТВОИ НАВЫКИ",
  Curiosity: "Любознательность",
  Creativity: "Креативность",
  "A future that fits you": "Будущее, которое тебе подходит",
  "Start with what you know": "Начни с того, что умеешь",
  "A little progress. A lot of possibility.":
    "Маленькие шаги. Большие возможности.",
  "Your career toolkit": "Всё для начала карьеры",
  "Tell your story": "Расскажи о себе",
  "Chat your way to a resume that shows what you can do.":
    "Создай резюме в диалоге и покажи, на что способен.",
  "Start a conversation": "Начать разговор",
  "Find your fit": "Найди своё место",
  "Discover student-friendly roles matched to your skills.":
    "Вакансии для студентов с учётом твоих навыков.",
  "Explore opportunities": "Посмотреть вакансии",
  "Make it personal": "Добавь личный подход",
  "Turn a job you love into a tailored cover letter.":
    "Создай сопроводительное письмо для выбранной вакансии.",
  "Find a role to write for": "Выбрать вакансию",
  "Opportunities to get you going": "Возможности для первого шага",
  "Sorted by the skills in your resume.":
    "Отсортировано по навыкам из твоего резюме.",
  "A few places your next chapter could begin.":
    "Здесь может начаться твой новый этап.",
  "View all jobs": "Все вакансии",
  "OPPORTUNITY LOOKS GOOD ON YOU": "НОВЫЕ ВОЗМОЖНОСТИ ЖДУТ ТЕБЯ",
  "Your shortlist.": "Твоё избранное.",
  "Find your next beginning.": "Найди свой старт.",
  "Keep the roles you love close. Take the next step when you’re ready.":
    "Сохраняй интересные вакансии и делай следующий шаг, когда будешь готов.",
  "Student-friendly opportunities, with room to grow.":
    "Вакансии для студентов с возможностью роста.",
  "Search jobs": "Поиск вакансий",
  "Job title, company, or skill": "Должность, компания или навык",
  Location: "Город",
  "All locations": "Все города",
  Remote: "Удалённо",
  Almaty: "Алматы",
  Astana: "Астана",
  "Experience level": "Уровень опыта",
  "All experience levels": "Любой опыт",
  "No experience": "Без опыта",
  Internship: "Стажировка",
  "Entry level": "Начальный уровень",
  "Finding opportunities…": "Ищем вакансии…",
  "jobs.count_one": "{count} вакансия",
  "jobs.count_few": "{count} вакансии",
  "jobs.count_many": "{count} вакансий",
  "jobs.count_other": "{count} вакансии",
  "Sorted by skill match": "По совпадению навыков",
  "We couldn’t load the jobs": "Не удалось загрузить вакансии",
  "Try again": "Попробовать снова",
  "Loading jobs": "Загрузка вакансий",
  "Your next opportunity belongs here": "Здесь будут твои избранные вакансии",
  "No jobs match these filters": "По этим фильтрам вакансий нет",
  "Tap the bookmark on a job to save it for later.":
    "Нажми на закладку в карточке вакансии, чтобы сохранить её.",
  "Try another keyword or widen your search.":
    "Попробуй другое слово или расширь поиск.",
  "Explore all jobs": "Посмотреть все вакансии",
  "Fictional listings for demonstration · Match scores reflect listed skill overlap · No applications are submitted":
    "Демонстрационные вакансии · Оценка отражает совпадение навыков · Отклики не отправляются",
  "START WITH A CONVERSATION": "НАЧНИ С РАЗГОВОРА",
  "Your experience matters.": "Твой опыт важен.",
  "Class projects, volunteering, side interests — it all starts somewhere.":
    "Учебные проекты, волонтёрство, увлечения — с чего-то всё начинается.",
  "Start over": "Начать заново",
  "Guided demo · No live AI connection": "Демо-помощник · Без подключения к ИИ",
  You: "Ты",
  "Putting your answer into place…": "Добавляем ответ в резюме…",
  "Your answer": "Твой ответ",
  "Tell us a little about yourself…": "Расскажи немного о себе…",
  "Send answer": "Отправить ответ",
  "Enter to send · Shift + Enter for a new line · Type “skip” to pass":
    "Enter — отправить · Shift + Enter — новая строка · «пропустить» — пропустить вопрос",
  "Your first draft is ready.": "Первый вариант готов.",
  "Review resume": "Посмотреть резюме",
  "YOUR STORY, TAKING SHAPE": "ТВОЯ ИСТОРИЯ ОБРЕТАЕТ ФОРМУ",
  "One step closer.": "На шаг ближе.",
  "Resume completeness": "Заполненность резюме",
  Introduction: "Знакомство",
  "Contact details": "Контакты",
  Education: "Образование",
  "Your skills": "Твои навыки",
  "Projects & experience": "Проекты и опыт",
  "Career interests": "Карьерные цели",
  "A small tip": "Небольшой совет",
  "You don’t have to sound impressive. Be specific about what you’ve done and what you’d love to learn.":
    "Не нужно громких слов. Расскажи конкретно, что ты делал и чему хочешь научиться.",
  "Saved in this browser. Your answers go to the local demo server, never to an AI service.":
    "Сохраняется в этом браузере. Ответы обрабатывает локальный демо-сервер, а не внешний ИИ-сервис.",
  "A LITTLE POLISH. ALL YOU.": "НЕМНОГО ОФОРМЛЕНИЯ. ВСЁ О ТЕБЕ.",
  "Your story on paper.": "Твоя история на бумаге.",
  "Edit your details, check the preview, and make it yours.":
    "Редактируй данные, проверяй результат и создавай своё резюме.",
  Markdown: "Markdown",
  HTML: "HTML",
  "Print / PDF": "Печать / PDF",
  "The details that make you, you.": "Детали, которые раскрывают тебя.",
  "Full name": "Имя и фамилия",
  "Email & location": "Эл. почта и город",
  "Skills (comma-separated)": "Навыки (через запятую)",
  "Fill with sample profile": "Заполнить примером",
  "Clear resume & letters": "Удалить резюме и письма",
  "LIVE PREVIEW": "ПРЕДПРОСМОТР",
  "Print / PDF opens your browser’s print dialog":
    "«Печать / PDF» открывает окно печати браузера",
  "A first step toward a future that feels like you.":
    "Первый шаг к будущему, которое подходит тебе.",
  "Made for students, with possibility.": "Для студентов и новых возможностей.",
  "Your name": "Имя и фамилия",
  Resume: "Резюме",
  "Email · City": "Эл. почта · Город",
  Skills: "Навыки",
  "resume.placeholder": "Здесь появится раздел «{section}».",
  "Save {title}": "Сохранить: {title}",
  "Unsave {title}": "Убрать из избранного: {title}",
  "{score}% match": "Совпадение: {score}%",
  "View fit": "Оценить совпадение",
  "Close job details": "Закрыть вакансию",
  "Your skill match": "Совпадение навыков",
  "match.explanation":
    "Совпадает {matched} из {total} указанных навыков. Это оценка по ключевым словам, а не прогноз трудоустройства.",
  "Your cover letter": "Сопроводительное письмо",
  "DEMO GENERATOR": "ДЕМО-ГЕНЕРАТОР",
  "A draft based on your resume and this role. Review before sharing.":
    "Черновик на основе резюме и вакансии. Проверь перед отправкой.",
  "Add your name and skills in My resume to generate a letter.":
    "Добавь имя и навыки в разделе «Моё резюме», чтобы создать письмо.",
  "Writing your draft…": "Создаём черновик…",
  "Regenerate draft": "Создать заново",
  "Generate cover letter": "Создать письмо",
  "Edit your cover letter": "Редактировать сопроводительное письмо",
  "Copied!": "Скопировано!",
  "Copy letter": "Скопировать письмо",
  "Drafts are saved separately for each language. Your edits are preserved.":
    "Для каждого языка сохраняется отдельный черновик. Твои правки сохраняются.",
  "Browser storage is unavailable or full. Changes will last only for this session; download your resume to keep it.":
    "Хранилище браузера недоступно или заполнено. Изменения сохранятся только до конца сессии; скачай резюме, чтобы не потерять его.",
  "Clipboard access is unavailable. Select the letter text and copy it manually.":
    "Буфер обмена недоступен. Выдели текст письма и скопируй вручную.",
  "The request failed. Please try again.":
    "Не удалось выполнить запрос. Попробуй снова.",
  "Could not connect to the server. Please try again.":
    "Не удалось подключиться к серверу. Попробуй снова.",
  "Provide a valid step and a message of 1–5,000 characters.":
    "Укажи корректный шаг и сообщение длиной от 1 до 5 000 символов.",
  "Invalid search filters.": "Некорректные фильтры поиска.",
  "That job could not be found.": "Вакансия не найдена.",
  "Add your name and skills to your resume first.":
    "Сначала добавь имя и навыки в резюме.",
  "API route not found.": "Маршрут API не найден.",
  "Request is too large.": "Запрос слишком большой.",
  "Invalid JSON request.": "Некорректный JSON-запрос.",
  "Something went wrong. Please try again.":
    "Что-то пошло не так. Попробуй снова.",
  "Let’s build a resume that feels like you. First, what’s your full name?":
    "Давай создадим резюме, которое расскажет о тебе. Как тебя зовут? Укажи имя и фамилию.",
  "Nice to meet you! What email and city would you like on your resume? You can skip this.":
    "Приятно познакомиться! Какую электронную почту и город указать в резюме? Этот вопрос можно пропустить.",
  "Tell me about your education: school or university, your field of study, and graduation year.":
    "Расскажи об образовании: школа или вуз, направление обучения и год выпуска.",
  "What skills would you bring to a team? Separate them with commas — for example React, Python, writing, or teamwork.":
    "Какие навыки ты можешь предложить команде? Перечисли через запятую, например: React, Python, написание текстов, работа в команде.",
  "Tell me about a project, volunteering, or work experience. Include what you did and any results. No formal experience needed!":
    "Расскажи о проекте, волонтёрстве или работе: что ты делал и каких результатов добился. Официальный опыт не обязателен!",
  "What kind of role are you looking for, and what do you hope to learn?":
    "Какую работу ты ищешь и чему хочешь научиться?",
  "Your first draft is ready! Review and edit it in My resume, then explore jobs that fit your skills.":
    "Первый вариант готов! Проверь его в разделе «Моё резюме», а затем посмотри подходящие вакансии.",
  "Sample resume loaded. You can edit every detail in My resume, or explore your matched jobs.":
    "Пример резюме загружен. Измени данные в разделе «Моё резюме» или посмотри подходящие вакансии.",
  "Part-time": "Частичная занятость",
  "Full-time": "Полная занятость",
  "LinkedIn-style demo": "Демо в стиле LinkedIn",
  "HeadHunter-style demo": "Демо в стиле HeadHunter",
  "WorkFinder demo": "Демо WorkFinder",
  "$18–25 / hour": "18–25 $ / час",
  "$12–18 / hour": "12–18 $ / час",
  "₸250k–400k / month": "250–400 тыс. ₸ / месяц",
  "₸150k–220k / month": "150–220 тыс. ₸ / месяц",
  "₸200k–300k / month": "200–300 тыс. ₸ / месяц",
  "₸100k–180k / month": "100–180 тыс. ₸ / месяц",
  "Frontend Developer Intern": "Стажёр frontend-разработчик",
  "Junior Product Designer": "Младший продуктовый дизайнер",
  "Data Analyst Intern": "Стажёр-аналитик данных",
  "Social Media Assistant": "Помощник SMM-специалиста",
  "Backend Developer Intern": "Стажёр backend-разработчик",
  "Research Assistant": "Ассистент исследователя",
  Design: "Дизайн",
  Research: "Исследования",
  Communication: "Коммуникация",
  Writing: "Написание текстов",
  Marketing: "Маркетинг",
  "Build accessible interfaces with our product team. Turn designs into reusable React components, improve CSS layouts, and collaborate through Git. Personal and university projects welcome.":
    "Создавай доступные интерфейсы вместе с продуктовой командой. Превращай макеты в компоненты React, улучшай CSS-вёрстку и работай с Git. Приветствуются личные и учебные проекты.",
  "Help design thoughtful digital experiences. Create Figma prototypes, conduct user research, and communicate design decisions. A student portfolio is welcome.":
    "Участвуй в создании удобных цифровых продуктов. Разрабатывай прототипы в Figma, проводи исследования пользователей и представляй дизайн-решения. Подойдёт студенческое портфолио.",
  "Explore product data with Python and SQL. Build Excel reports and explain insights to a supportive analytics team. Coursework and personal projects count.":
    "Анализируй данные продукта с помощью Python и SQL. Создавай отчёты в Excel и обсуждай выводы с командой аналитиков. Учебные и личные проекты тоже учитываются.",
  "Create social content, write thoughtful captions, and help plan campaigns. Bring curiosity, clear writing, and an interest in marketing. Training provided.":
    "Создавай контент для соцсетей, пиши тексты и помогай планировать кампании. Важны любознательность, грамотная речь и интерес к маркетингу. Предусмотрено обучение.",
  "Build and test Node.js APIs, work with SQL databases, and review code with experienced engineers. Show us a course project or something you built yourself.":
    "Создавай и тестируй API на Node.js, работай с базами SQL и обсуждай код с опытными инженерами. Покажи учебный проект или собственную разработку.",
  "Support education research, organize survey results, and summarize findings. Ideal for students with strong writing and a careful approach to data.":
    "Помогай в исследованиях образования, систематизируй результаты опросов и готовь выводы. Подойдёт студентам, которые хорошо пишут и внимательно работают с данными.",
  "letter.greeting": "Здравствуйте, команда {company}!",
  "letter.application": "Меня заинтересовала вакансия «{title}».",
  "letter.education": "Моё образование: {education}.",
  "letter.educationFallback":
    "Я ищу возможность учиться и приносить пользу в команде, готовой поддержать начинающего специалиста.",
  "letter.skills": "Для этой роли будут полезны мои навыки: {skills}.",
  "letter.skillsFallback":
    "Я хочу развивать навыки, необходимые для этой роли.",
  "letter.projects": "Хочу отметить следующий опыт: {projects}",
  "letter.projectsFallback":
    "Буду рад возможности проявить любознательность и готовность учиться.",
  "letter.goals": "Мои карьерные интересы: {goals}.",
  "letter.interest":
    "Мне близки задачи, описанные в вакансии «{title}». Буду рад обсудить, как могу быть полезен вашей команде.",
  "letter.thanks": "Спасибо за рассмотрение моей кандидатуры.",
  "letter.signoff": "С уважением,",
  "letter.nameFallback": "[Ваше имя]",
  "ai.quota":
    "Лимит ИИ-сервиса исчерпан. Приложение временно работает в автономном режиме.",
  "ai.unavailable":
    "ИИ-сервис временно недоступен. Приложение переключилось на автономный режим.",
  "ai.fallback":
    "ИИ временно недоступен — результат подготовлен в автономном режиме. Проверьте его перед использованием.",
  "AI offline mode": "Автономный режим ИИ",
  "Live AI": "ИИ подключён",
  "network.offline": "Нет подключения к интернету. Изменения не сохранятся, пока связь не восстановится.",
  "network.online": "Подключение восстановлено",
  "Assessing fit…": "Оцениваем соответствие…",
  "Saving…": "Сохраняем…",
  "Reload page": "Перезагрузить страницу",
  "fallback.ask.name": "Как вас зовут? Напишите имя и фамилию.",
  "fallback.ask.contact":
    "Как с вами связаться? Укажите электронную почту и город (без паспортных и других личных номеров).",
  "fallback.ask.education": "Где и чему вы учитесь или учились?",
  "fallback.ask.skills": "Какими навыками вы владеете? Перечислите их через запятую.",
  "fallback.ask.projects":
    "Расскажите о проекте, стажировке, волонтёрстве или работе, которыми гордитесь.",
  "fallback.ask.goals": "Какой график и формат вам подходят: полный день, подработка, стажировка, удалённо?",
  "fallback.saved": "Записал.",
  "fallback.intro":
    "ИИ-помощник временно недоступен, поэтому я задам несколько простых вопросов.",
  "fallback.complete": "Все основные разделы заполнены. Нажмите «Составить резюме» — соберу полный черновик.",
  "fallback.matchExplanation":
    "Автономная оценка по ключевым словам: совпало {matched} из {total} требований. Это приблизительный ориентир, а не решение работодателя.",
  "fallback.matchNoSkills":
    "Добавьте навыки в резюме, чтобы получить оценку соответствия.",
  Sources: "Источники",
  "Reset filters": "Сбросить фильтры",
  "source.short.unavailable": "недоступен",
  "source.short.unsupportedFilters": "не поддерживает фильтры",
  "Add to saved": "В избранное",
  "In saved": "В избранном",
  "Open My resume": "Открыть «Моё резюме»",
  "Job description": "Описание вакансии",
  "Show full description": "Показать полностью",
  Collapse: "Свернуть",
  Offline: "Нет сети",
  "Answers given": "Сколько ответов вы дали",
  "chat.answers_one": "{count} ответ",
  "chat.answers_few": "{count} ответа",
  "chat.answers_many": "{count} ответов",
  "chat.answers_other": "{count} ответа",
  City: "Город",
  Country: "Страна",
  Projects: "Проекты",
  "Work experience": "Опыт работы",
  "Field or desired role": "Сфера или желаемая должность",
  "Email or phone": "Эл. почта или телефон",
  "Role · City, country · Email": "Должность · Город, страна · Почта",
  "City and country": "Город и страна",
  "Education or experience": "Учёба или опыт",
  "Needed to match jobs": "Нужно для подбора вакансий",
  "for jobs": "для вакансий",
  "Your resume is ready!": "Резюме готово!",
  "Now I can pick jobs for you in {place}.":
    "Теперь я могу подобрать вакансии для вас: {place}.",
  "your city": "ваш город",
  "Show my jobs": "Показать мои вакансии",
  "Your resume is ready! Jobs are now matched to you.":
    "Резюме готово! Вакансии подобраны под вас.",
  "Anywhere (remote)": "Весь мир, удалённо",
  "Any city": "Любой город",
  "Back to my matches": "Вернуть мой подбор",
  "Let’s match jobs to you": "Давайте подберём вакансии под вас",
  "Tell the assistant about yourself: your city, field, studies and skills. Then we’ll show jobs that fit you first.":
    "Расскажите ассистенту о себе: город, сферу, учёбу и навыки. Тогда первыми будут вакансии, которые подходят именно вам.",
  "Continue in chat": "Продолжить в чате",
  "Matched to your resume: {role} · {place}":
    "Подобрано по резюме: {role} · {place}",
  "any role": "любая должность",
  anywhere: "где угодно",
  "Hi! I’m your career assistant. Together we’ll build your resume step by step and then find jobs in your city. Let’s start: what’s your first and last name?":
    "Привет! Я ваш карьерный ассистент. Вместе соберём резюме шаг за шагом, а потом найдём вакансии в вашем городе. Начнём: как вас зовут? Напишите имя и фамилию.",
  "fallback.ask.city":
    "В каком городе и стране вы хотите работать? Например: Алматы, Казахстан.",
  "fallback.ask.country": "В какой стране вы ищете работу?",
  "fallback.ask.occupation":
    "Какая сфера или должность вам интересна? Например: frontend-разработчик, бухгалтер, SMM-специалист.",
  "fallback.ask.experience":
    "Был ли у вас опыт работы, стажировки или подработки? Если нет — так и напишите, это нормально.",
  "letter.experience": "Мой опыт: {experience}.",
  "jobs.migrationRequired":
    "Часть новых вакансий нельзя сохранить в избранное, пока администратор не применит миграцию базы 202611070001.",
  "Field of work": "Сфера работы",
  needed: "нужно",
  "CIS countries": "Страны СНГ",
  "Clear resume and chat?": "Очистить резюме и чат?",
  Clear: "Очистить",
  "reset.consequences":
    "Резюме и вся переписка с ассистентом будут удалены. Сопроводительные письма и избранные вакансии останутся.",
  "Download resume": "Скачать резюме",
  "For employers and printing": "Для работодателя и печати",
  "Plain text for editing": "Простой текст для правок",
  "Fill in with the assistant": "Заполнить с ассистентом",
  "resume.emptyHint":
    "Чтобы скачать резюме, добавьте имя и хотя бы один раздел: навыки, опыт, образование или проекты.",
  "resume.empty":
    "Резюме пока пустое. Добавьте имя и хотя бы один раздел: навыки, опыт, образование или проекты.",
  "ai.limitHour":
    "Вы отправили много запросов ассистенту за последний час. Сделайте небольшой перерыв — лимит восстановится в течение часа. Резюме и переписка сохранены.",
  "ai.limitDay":
    "Дневной лимит запросов к ассистенту исчерпан. Продолжим завтра — резюме и переписка сохранены. Вакансии можно смотреть и сейчас.",
  "Compose my resume": "Составить резюме",
  "Publish my resume": "Опубликовать резюме",
  "Resume published": "Резюме опубликовано",
  "Your resume is published": "Резюме сохранено",
  "It is now in My resume, ready to download and to match jobs.": "Оно во вкладке «Моё резюме»: его можно скачать, а вакансии теперь подбираются по нему.",
  "The essentials are collected": "Основное собрано",
  "I can put your full resume together now, or answer a few more questions first to make it stronger.": "Могу составить полное резюме уже сейчас — или ответьте ещё на пару вопросов, чтобы оно было сильнее.",
  "Resume draft": "Черновик резюме",
  "Draft": "Черновик",
  "Previous draft": "Предыдущий черновик",
  "Publish resume": "Опубликовать",
  "Want changes? Just write them in the chat.": "Нужны правки? Просто напишите их в чат.",
  "About me": "О себе",
  "Your draft is waiting in the chat": "Черновик ждёт вас в чате",
  "Your resume will appear here": "Здесь появится ваше резюме",
  "Review the draft the assistant composed, ask for changes if needed, and press «Publish resume».": "Посмотрите резюме, которое составил ассистент, попросите правки, если нужно, и нажмите «Сохранить резюме».",
  "Answer a few questions in the chat — the assistant will compose a complete resume for you. After you publish it, it appears here in full, ready to edit and download.": "Ответьте на вопросы ассистента в чате — он составит для вас подробное резюме. После сохранения оно появится здесь целиком: его можно будет править и скачивать.",
  "Open the draft": "Открыть черновик",
  "Fill it in manually": "Заполнить вручную",
  "resume.publishedMessage": "Готово — резюме сохранено! Оно во вкладке «Моё резюме», и вакансии теперь подбираются по нему. Если захотите что-то поменять, напишите здесь — подготовлю новую версию.",
  "resume.publishedManually": "Резюме сохранено вручную.",
  "draft.summary.role": "Начинающий специалист в сфере «{role}».",
  "draft.summary.place": "Ищу работу: {place}.",
  "draft.summary.skills": "Навыки: {skills}.",
  "draft.readyOffline": "Собрал резюме из ваших ответов. Проверьте его: напишите, что поправить, или нажмите «Сохранить резюме».",
  "Your resume and field are not formed yet": "Ваше резюме и сфера деятельности ещё не сформированы",
  "That is why there are no matching jobs yet. Finish the conversation with the assistant — after you publish your resume, we will pick jobs for your field and city.": "Поэтому подходящих вакансий пока нет. Закончите разговор с ассистентом — после публикации резюме мы подберём вакансии под вашу сферу и город.",
  "Start with the assistant": "Начать с ассистентом",
  "Courses and certificates": "Курсы и сертификаты",
  "Personal qualities": "Личные качества",
  "Languages": "Языки",
  "Achievements": "Достижения",
  "Courses": "Курсы",
  "Save resume": "Сохранить резюме",
  "Your resume is saved": "Резюме сохранено",
  "Edit": "Редактировать",
  "Improve with the assistant": "Улучшить с ассистентом",
  "Unsaved changes": "Есть несохранённые изменения",
  "Saved in your account": "Сохранено в вашем аккаунте",
  "How complete is your resume": "Насколько полное резюме",
  "resume.sectionsFilled": "Заполнено разделов: {filled} из {total}",
  "Not filled yet": "Пока не заполнено",
  "Add with the assistant": "Дополнить с ассистентом",
  "Basics": "Основное",
  "Each item on a new line": "Каждый пункт — с новой строки",
  "Editing your resume": "Редактирование резюме",
  "Changes are saved to My resume and used to match jobs.": "Изменения сохранятся в «Моё резюме», и вакансии будут подбираться по ним.",
  "A resume that works for you.": "Резюме, которое работает на вас.",
  "YOUR RESUME": "ВАШЕ РЕЗЮМЕ",
  "Review it, download it, or improve it with the assistant.": "Проверьте, скачайте или улучшите его вместе с ассистентом.",
  "chat.offline.review": "Сейчас ИИ недоступен, но черновик уже готов. Если всё устраивает — нажмите «Сохранить резюме». Правки можно внести и вручную во вкладке «Моё резюме» после сохранения.",
  "chat.offline.saved": "Сейчас ИИ недоступен. Ваше резюме сохранено во вкладке «Моё резюме» — там его можно отредактировать вручную и скачать.",
  "fallback.ask.courses": "Проходили ли вы курсы, получали сертификаты или участвовали в олимпиадах? Если нет — напишите «нет».",
  "fallback.ask.strengths": "Какие ваши личные качества помогут в работе? Если можете, приведите пример. Если не хотите — напишите «нет».",
  "fallback.ask.languages": "Какими языками вы владеете и на каком уровне?",
  "fallback.ask.achievements": "Есть ли достижения, которыми вы гордитесь: награды, конкурсы, высокие оценки? Если нет — напишите «нет».",
};

const en = Object.fromEntries(Object.keys(ru).map((key) => [key, key]));
Object.assign(en, {
  "ai.busy": "Generation is already in progress. Please wait.",
  "setup.required":
    "Could not connect. Check the server and Supabase configuration, then try again.",
  "auth.required": "Sign in and verify your email to continue.",
  "auth.failed":
    "Sign-in failed: wrong email or password. If you signed up with Google, use “Continue with Google”.",
  "auth.signupCheckEmail":
    "Check your inbox for a confirmation link. If no email arrives, an account with this address may already exist — sign in (including with Google) or reset your password.",
  "jobs.sampled":
    "Showing a loaded sample, not the complete source catalogs. Remote jobs may have country restrictions.",
  "source.ok": "Loaded",
  "source.notConfigured": "API key required",
  "source.unavailable": "Temporarily unavailable",
  "source.unsupportedFilters":
    "Skipped: source lacks data for the selected filters",
  "jobs.notFound": "This job is no longer available. Refresh your search.",
  "jobs.accessDenied":
    "HeadHunter denied access to job search. The administrator needs to configure or verify the HeadHunter API token.",
  "auth.googleDisabled":
    "Google sign-in is not configured yet. Please use email for now.",
  "auth.googleFailed":
    "Google sign-in was cancelled or failed. Try again or sign in with email.",
  "auth.timeout":
    "The authentication service took too long to respond. Please try again.",
  "auth.checkEmail":
    "If the address is eligible, an email with next steps will be sent.",
  "request.invalid": "Please check the submitted fields.",
  "service.unavailable":
    "The service is temporarily unavailable. Try again later.",
  "ai.failed":
    "AI could not finish the response. Try later or contact the administrator.",
  "rate.limit": "Too many requests. Please try again later.",
  "resume.conflict":
    "This resume changed in another tab. Copy your edits and reload.",
  "chat.full":
    "Conversation limit reached. Save your resume and start a new conversation.",
  "jobs.failed": "Could not fetch HeadHunter jobs. Try again later.",
  "jobs.count_one": "{count} opportunity",
  "jobs.count_few": "{count} opportunities",
  "jobs.count_many": "{count} opportunities",
  "jobs.count_other": "{count} opportunities",
  "resume.placeholder": "Your {section} will appear here.",
  "match.explanation":
    "Matches {matched} of {total} listed skills. This is a transparent keyword score, not a hiring prediction.",
  "letter.greeting": "Dear {company} hiring team,",
  "letter.application": "I am writing to apply for the {title} position.",
  "letter.education": "My education includes: {education}.",
  "letter.educationFallback":
    "I am looking for an opportunity to learn and contribute in a supportive team.",
  "letter.skills": "I would bring skills in {skills} to this role.",
  "letter.skillsFallback":
    "I am interested in developing the skills required for this role.",
  "letter.projects": "One experience I would like to highlight is: {projects}",
  "letter.projectsFallback":
    "I would welcome the chance to demonstrate my curiosity and willingness to learn.",
  "letter.goals": "My career interests are: {goals}.",
  "letter.interest":
    "The responsibilities in your {title} role particularly interest me. I would appreciate the opportunity to discuss how I could contribute to your team.",
  "letter.thanks": "Thank you for your consideration.",
  "letter.signoff": "Best regards,",
  "letter.nameFallback": "[Your name]",
  "WorkFinder — Your next chapter": "workfinder. — your next chapter",
  "WorkFinder — turn your potential into your next opportunity.":
    "workfinder. — turn your potential into your next opportunity.",
  "ai.quota":
    "The AI provider's quota is exhausted. The app is temporarily running in offline mode.",
  "ai.unavailable":
    "The AI service is temporarily unavailable. The app switched to offline mode.",
  "ai.fallback":
    "AI is temporarily unavailable — this result was prepared in offline mode. Review it before using it.",
  "network.offline": "You are offline. Changes will not be saved until the connection returns.",
  "network.online": "Back online",
  "fallback.ask.name": "What is your name? Please write your first and last name.",
  "fallback.ask.contact":
    "How can employers reach you? Share an email and your city (no ID numbers or other sensitive identifiers).",
  "fallback.ask.education": "Where and what do you study, or have you studied?",
  "fallback.ask.skills": "Which skills do you have? List them separated by commas.",
  "fallback.ask.projects":
    "Tell me about a project, internship, volunteering or job you are proud of.",
  "fallback.ask.goals": "Which schedule and format suit you: full-time, part-time, internship or remote?",
  "fallback.saved": "Got it.",
  "fallback.intro":
    "The AI assistant is temporarily unavailable, so I will ask a few simple questions.",
  "fallback.complete": "All main sections are filled in. Press «Compose my resume» and I will put a full draft together.",
  "fallback.matchExplanation":
    "Offline keyword estimate: {matched} of {total} requirements matched. This is a rough guide, not an employer decision.",
  "fallback.matchNoSkills": "Add skills to your resume to get a fit estimate.",
  "source.short.unavailable": "unavailable",
  "source.short.unsupportedFilters": "filters not supported",
  "Answers given": "How many answers you have given",
  "chat.answers_one": "{count} answer",
  "chat.answers_other": "{count} answers",
  "Role · City, country · Email": "Role · City, country · Email",
  "fallback.ask.city":
    "Which city and country do you want to work in? For example: Almaty, Kazakhstan.",
  "fallback.ask.country": "Which country are you looking for work in?",
  "fallback.ask.occupation":
    "Which field or role interests you? For example: frontend developer, accountant, SMM specialist.",
  "fallback.ask.experience":
    "Have you had any work experience, internships or part-time jobs? If not, just say so — that's fine.",
  "letter.experience": "My experience includes: {experience}.",
  "jobs.migrationRequired":
    "Some new jobs can't be saved yet until the administrator applies database migration 202611070001.",
  "reset.consequences":
    "Your resume and the whole conversation with the assistant will be deleted. Cover letters and saved jobs will stay.",
  "resume.emptyHint":
    "To download your resume, add your name and at least one section: skills, experience, education or projects.",
  "resume.empty":
    "Your resume is still empty. Add your name and at least one section: skills, experience, education or projects.",
  "ai.limitHour":
    "You have sent many requests to the assistant in the last hour. Take a short break — the limit resets within an hour. Your resume and chat are saved.",
  "ai.limitDay":
    "The daily assistant limit is used up. Let’s continue tomorrow — your resume and chat are saved. You can still browse jobs.",
  "Compose my resume": "Compose my resume",
  "Publish my resume": "Publish my resume",
  "Resume published": "Resume published",
  "Your resume is published": "Your resume is saved",
  "It is now in My resume, ready to download and to match jobs.": "It is now in My resume, ready to download and to match jobs.",
  "The essentials are collected": "The essentials are collected",
  "I can put your full resume together now, or answer a few more questions first to make it stronger.": "I can put your full resume together now, or answer a few more questions first to make it stronger.",
  "Resume draft": "Resume draft",
  "Draft": "Draft",
  "Previous draft": "Previous draft",
  "Publish resume": "Publish resume",
  "Want changes? Just write them in the chat.": "Want changes? Just write them in the chat.",
  "About me": "About me",
  "Your draft is waiting in the chat": "Your draft is waiting in the chat",
  "Your resume will appear here": "Your resume will appear here",
  "Review the draft the assistant composed, ask for changes if needed, and press «Publish resume».": "Review the resume the assistant composed, ask for changes if needed, and press «Save resume».",
  "Answer a few questions in the chat — the assistant will compose a complete resume for you. After you publish it, it appears here in full, ready to edit and download.": "Answer the assistant's questions in the chat — it will compose a detailed resume for you. After you save it, it appears here in full, ready to edit and download.",
  "Open the draft": "Open the draft",
  "Fill it in manually": "Fill it in manually",
  "resume.publishedMessage": "Done — your resume is saved! It is in My resume, and jobs are now matched to it. If you want to change anything, write here and I will prepare a new version.",
  "resume.publishedManually": "Resume saved manually.",
  "draft.summary.role": "Aspiring {role}.",
  "draft.summary.place": "Looking for work in {place}.",
  "draft.summary.skills": "Skills: {skills}.",
  "draft.readyOffline": "I put your resume together from your answers. Check it: write what to change, or press «Save resume».",
  "Your resume and field are not formed yet": "Your resume and field are not formed yet",
  "That is why there are no matching jobs yet. Finish the conversation with the assistant — after you publish your resume, we will pick jobs for your field and city.": "That is why there are no matching jobs yet. Finish the conversation with the assistant — after you publish your resume, we will pick jobs for your field and city.",
  "Start with the assistant": "Start with the assistant",
  "Save resume": "Save resume",
  "Your resume is saved": "Your resume is saved",
  "resume.sectionsFilled": "Sections filled: {filled} of {total}",
  "chat.offline.review": "The AI is unavailable right now, but your draft is ready. If everything suits you, press «Save resume». You can also edit it by hand in My resume after saving.",
  "chat.offline.saved": "The AI is unavailable right now. Your resume is saved in My resume — you can edit it by hand and download it there.",
  "fallback.ask.courses": "Have you taken any courses, earned certificates or taken part in olympiads? If not, write «no».",
  "fallback.ask.strengths": "Which personal qualities will help you at work? Give an example if you can. If you prefer to skip, write «no».",
  "fallback.ask.languages": "Which languages do you speak, and at what level?",
  "fallback.ask.achievements": "Any achievements you are proud of: awards, competitions, top grades? If not, write «no».",
});

export const dictionaries = { en, ru };
export const DEFAULT_LANGUAGE = "ru";
export const LANGUAGE_STORAGE_KEY = "workfinder-language";
export function normalizeLanguage(value: unknown) {
  return value === "en" || value === "ru" ? value : DEFAULT_LANGUAGE;
}
export function readLanguage(storage: Pick<Storage, "getItem">) {
  try {
    return normalizeLanguage(storage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
export function translate(
  language: unknown,
  key: string,
  params: Record<string, string | number> = {},
) {
  const locale = normalizeLanguage(language);
  const resolvedKey =
    typeof params.count === "number"
      ? `${key}_${new Intl.PluralRules(locale).select(params.count)}`
      : key;
  const text = Object.hasOwn(dictionaries[locale], resolvedKey)
    ? dictionaries[locale][resolvedKey]
    : Object.hasOwn(dictionaries.en, resolvedKey)
      ? dictionaries.en[resolvedKey]
      : key;
  // Replace tokens once; never interpret user content as a translation key or another template.
  return text.replace(/\{(\w+)\}/g, (token, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : token,
  );
}
