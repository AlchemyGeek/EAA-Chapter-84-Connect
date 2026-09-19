// 2026 New Member Survey — Class of 2026
// Question wording mirrors the board-approved spec, with the year updated to 2026.

export const SURVEY_KEY = "new-member-2026";
export const SURVEY_PATH = "/survey-new-members-2026";

export type QuestionType = "single" | "multi" | "open" | "grid" | "nps";

export interface SurveyQuestion {
  id: string; // "q1" ... "q28"
  text: string;
  type: QuestionType;
  required: boolean; // ★ core questions
  options?: string[];
  maxPicks?: number;
  allowOther?: boolean; // appends an "Other: ____" free-text option
  rows?: string[];
  /** Optional reference links shown under specific grid rows. */
  rowLinks?: Record<string, string>;
  columns?: string[];
  /** Grid columns are an ordered 1-5 scale (low label -> high label); adds an N/A choice when set. */
  scaleLabels?: [string, string];
  allowNA?: boolean;
  multiline?: boolean;
}

export interface SurveySection {
  title: string;
  questions: SurveyQuestion[];
}

const PERSONAS = [
  "Builder / Future Builder — building or planning to build an aircraft; interested in techniques, tools, kit selection",
  "Owner — own an aircraft; interested in maintenance, upgrades, avionics, ownership",
  "Pilot — flying or working toward a certificate; interested in proficiency, weather, safety, cross-country",
  "Aviation Enthusiast — interested in aviation history, airshow culture, and emerging technology",
  "Young Eagle / Young Eagle family — introduced to aviation through a Young Eagles flight",
  "None of these fit me quite right",
];

const AGREEMENT = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
const SATISFACTION = ["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"];

export const SURVEY_SECTIONS: SurveySection[] = [
  {
    title: "Section 1 — About You",
    questions: [
      { id: "q1", text: "Which best describes you? Select all that apply.", type: "multi", required: true, options: PERSONAS },
      { id: "q2", text: "If you had to pick just one, which is your primary category?", type: "single", required: true, options: PERSONAS },
      { id: "q3", text: "Anything about how you'd describe yourself that these categories miss?", type: "open", required: false, multiline: true },
      { id: "q6", text: "Which quarter of 2026 did you join?", type: "single", required: false, options: ["Q1", "Q2", "Q3", "Q4", "Not sure"] },
    ],
  },
  {
    title: "Section 2 — Activities and Interests",
    questions: [
      {
        id: "q7", text: "How interested are you in each of these chapter activities?", type: "grid", required: true,
        columns: ["I already participate", "Very interested", "Somewhat interested", "Not interested"],
        rowLinks: {
          "IMC / VMC clubs (instrument and proficiency-focused; possibly virtual)":
            "https://www.eaa.org/eaa/pilots/eaa-pilot-proficiency/proficiency-and-education-programs",
        },
        rows: [
          "Monthly member meetings and presentations",
          "Burger Burn events",
          "Young Eagles flight events",
          "Build and restoration projects (working alongside other builders)",
          "Time in the chapter hangar / work parties",
          "Fly-outs and group flights",
          "IMC / VMC clubs (instrument and proficiency-focused; possibly virtual)",
          "Tech counselor visits and build inspections",
          "Community and airport outreach",
        ],
      },
      {
        id: "q8", text: "Which presentation topics would you most want to see? Pick up to 5.", type: "multi", required: true, maxPicks: 5, allowOther: true,
        options: [
          "Build techniques (aluminum, composites, welding, wiring)",
          "Kit and plans selection, project planning",
          "Maintenance and condition inspections",
          "Avionics and panel upgrades",
          "Proficiency and stick-and-rudder skills",
          "Weather, cross-country planning, safety and risk management",
          "Aviation history and warbirds",
          "Emerging aviation technology (electric propulsion, new kits, etc.)",
          "Airshow and AirVenture trip reports and tips",
          "Careers, scholarships, and flight-training pathways",
          "Member show-and-tell of their aircraft or projects",
        ],
      },
      { id: "q11", text: "What one activity or program do you wish the chapter offered that it doesn't today?", type: "open", required: false, multiline: true },
    ],
  },
  {
    title: "Section 3 — Resources: Website, Connect, Newsletter",
    questions: [
      {
        id: "q12", text: "For each resource, how often do you use it?", type: "grid", required: true,
        columns: ["Regularly", "Occasionally", "Tried once", "Didn't know about it"],
        rows: [
          "Chapter website (eaa84.org)",
          "Chapter84 Connect member portal",
          "Monthly newsletter",
        ],
      },
      {
        id: "q13", text: "How satisfied are you with each resource you've used?", type: "grid", required: true,
        columns: SATISFACTION, scaleLabels: ["Very dissatisfied", "Very satisfied"], allowNA: true,
        rows: ["Chapter website", "Chapter84 Connect", "Monthly newsletter"],
      },
      {
        id: "q14", text: "Agree or disagree:", type: "grid", required: false,
        columns: AGREEMENT, scaleLabels: ["Strongly disagree", "Strongly agree"],
        rows: [
          "I can easily find upcoming events and dates.",
          "I can easily find how to get involved.",
          "Chapter communications tell me what I need to know without being overwhelming.",
          "I know where to go when I have a question.",
        ],
      },
      { id: "q16", text: "What would make Connect more useful to you?", type: "open", required: false, multiline: true },
      {
        id: "q17", text: "How would you prefer to hear from the chapter? Rank your top 2.", type: "multi", required: false, maxPicks: 2, allowOther: true,
        options: ["Email", "Newsletter", "Connect notifications", "Text message", "Website", "At meetings"],
      },
    ],
  },
  {
    title: "Section 4 — Your Onboarding Experience",
    questions: [
      {
        id: "q19", text: "Agree or disagree:", type: "grid", required: true,
        columns: AGREEMENT, scaleLabels: ["Strongly disagree", "Strongly agree"],
        rows: [
          "I felt welcome from my first contact with the chapter.",
          "I heard back promptly after joining or applying.",
          "I understood what my membership includes and how dues work.",
          "I knew what to expect at my first meeting.",
          "I met people with interests similar to mine.",
          "I quickly found a way to get involved.",
          "I understood how to use Connect and other chapter resources.",
        ],
      },
      {
        id: "q23", text: "What did you need in your first 90 days that you didn't get? Select all that apply.", type: "multi", required: false, allowOther: true,
        options: [
          "A person to show me around / mentor",
          "Clearer info on upcoming events",
          "Help finding a build project or builder community",
          "Guidance on getting started with flying or training",
          "A clearer explanation of membership benefits",
          "Help using Connect or the website",
          "More social or informal time with members",
          "Nothing — I got what I needed",
        ],
      },
    ],
  },
  {
    title: "Section 5 — Looking Ahead",
    questions: [
      {
        id: "q24", text: "How likely are you to renew your membership next year?", type: "single", required: true,
        options: ["Definitely", "Probably", "Not sure", "Probably not", "Definitely not"],
      },
      { id: "q25", text: "How likely are you to recommend Chapter 84 to a friend interested in aviation?", type: "nps", required: true },
      {
        id: "q26", text: "If you'd be willing to help, where would you be interested in volunteering? Select all that apply.", type: "multi", required: false,
        options: [
          "Events (Burger Burn, meetings, special events)",
          "Young Eagles",
          "Build assistance",
          "Chapter operations (newsletter, media, membership, admin)",
          "Mentoring new members",
          "Not right now",
          "Ask me again later",
        ],
      },
      { id: "q27", text: "Anything else you want the board to know?", type: "open", required: false, multiline: true },
      {
        id: "q28",
        text: "Optional: Name and email if you're open to a follow-up conversation. If you leave this blank, your response stays anonymous.",
        type: "open", required: false, multiline: false,
      },
    ],
  },
];

export const ALL_QUESTIONS: SurveyQuestion[] = SURVEY_SECTIONS.flatMap((s) => s.questions);

export const OPEN_TEXT_QUESTIONS = ["q11", "q16", "q27"];

export const SURVEY_INTRO_TITLE = "New to the Pattern — tell us how we're doing";
export const SURVEY_INTRO_BODY =
  "Welcome aboard! You joined Chapter 84 in 2026, and we'd love to hear how it's going. This short survey (about 7–8 minutes) helps us understand what you're interested in, how our website, Chapter84 Connect, and newsletter are working for you, and how your first months with the chapter felt. Your answers go to the board as a group summary. Blunt feedback is welcome — it's the most useful kind. Name and email are optional at the end.";
