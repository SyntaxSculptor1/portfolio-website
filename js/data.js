// ================================================================
//  data.js  —  YOUR ENTIRE PORTFOLIO CONTENT LIVES HERE
//
//  This is the only file you need to edit to update your portfolio.
//  The 3D scene, animations, and terminal windows all read from
//  this object automatically.
//
//  QUICK START:
//    1. Fill in your name, tagline, and bio in the sections below.
//    2. Replace each project's title / description / stack / links.
//    3. Drop screenshots into assets/images/ named p1.jpg … p5.jpg.
//    4. Replace assets/audio/bg.mp3 with your ambient background track.
//    5. Open index.html in a browser — done.
//
//  ADDING A YOUTUBE VIDEO TO A PROJECT:
//    Set the `youtube` field to any YouTube URL, e.g.
//      youtube: "https://youtu.be/dQw4w9WgXcQ"
//    Supported formats: youtu.be/ID | watch?v=ID | /embed/ID
//    Leave as "" to show no video panel on that project.
//
//  SCREEN ORDER (top-to-bottom, left-to-right on the physical model):
//    [0] Top far-left    →  Archive  (smaller / side projects)
//    [1] Top centre      →  About Me
//    [2] Top right       →  Contact
//    [3] Mid far-left    →  Skills
//    [4] Mid centre-left →  Project 01
//    [5] Mid right       →  Project 02
//    [6] Centre front    →  Project 03  ← most visible, use your best work
//    [7] Lower left      →  Project 04
//    [8] Lower right     →  Project 05
//
//  GLOW COLOURS:
//    glowColor sets the screen background AND the terminal accent colour.
//    Use any CSS hex value, e.g. "#00ff88", "#0088ff", "#ff2200".
// ================================================================

const PORTFOLIO_DATA = {

  // ── HERO TEXT ───────────────────────────────────────────────────
  // Displayed at the bottom of the screen after the boot sequence.
  name: "RICARDO RUBERT",
  tagline: "AI ENGINEER · COMPETITIVE PROGRAMMER",

  // ── BACKGROUND MUSIC ────────────────────────────────────────────
  // Loops continuously after the user clicks ENTER.
  // Replace this file with your own track (mp3/ogg).
  // Good royalty-free sources: Pixabay Music, Mixkit, Free Music Archive
  // Recommended search terms: "dark ambient synthwave" / "CRT retrowave lo-fi"
  bgMusic: "assets/audio/bg.mp3",


  // ── SCREENS ─────────────────────────────────────────────────────
  screens: [

    // ── [0] ARCHIVE ─────────────────────────────────────────────
    // Smaller side-projects, experiments, or coursework.
    // Add as many entries to `projects` as you like — they paginate.
    {
      type: "minor-projects",
      glowColor: "#aa44ff",
      label: "ARCHIVE.DIR",
      content: {
        projects: [
          {
            title: "Mini Project Alpha",
            year: "2024",
            desc: "Short description of what this project does and why it was interesting.",
            stack: ["Python", "NumPy"],
            github: "https://github.com/YOURUSERNAME/repo",
          },
          {
            title: "Mini Project Beta",
            year: "2024",
            desc: "Short description of what this project does and why it was interesting.",
            stack: ["C++", "STL"],
            github: "https://github.com/YOURUSERNAME/repo",
          },
          {
            title: "Mini Project Gamma",
            year: "2023",
            desc: "Short description of what this project does and why it was interesting.",
            stack: ["Python", "Pandas"],
            github: "https://github.com/YOURUSERNAME/repo",
          },
        ],
      },
    },

    // ── [1] ABOUT ME ────────────────────────────────────────────
    {
      type: "about",
      glowColor: "#0088ff",
      label: "ABOUT.ME",
      content: {
        heading: "RICARDO RUBERT",
        subheading: "Student · AI Engineer · Programing Competitor",
        bio:
          `I am a bachelors student at the university of Groningen where I study AI.
          I like to take on projects as well as to compete in algorithmic and
          machine learning programming competitions. I always push my limmits and try to go further.

          I am also a experience tutor with over 3 years of experience Teaching highschool physics,
          maths and most importantly computer science.

          This portfolio is the lab. Everything here was built, trained, and competed with.
`,
        links: [
          { label: "GitHub", url: "https://github.com/SyntaxSculptor1" },
          { label: "LinkedIn", url: "https://www.linkedin.com/in/ricardorubert/" },
        ],
      },
    },

    // ── [2] CONTACT ─────────────────────────────────────────────
    {
      type: "contact",
      glowColor: "#ffaa00",
      label: "CONTACT.EXE",
      content: {
        heading: "GET IN TOUCH",
        lines: [
          { label: "EMAIL", value: "Ricardo@rubert.es", url: "mailto:ricardo@rubert.es" },
          { label: "GITHUB", value: "https://github.com/SyntaxSculptor1", url: "https://github.com/SyntaxSculptor1" },
          { label: "LINKEDIN", value: "https://www.linkedin.com/in/ricardorubert/", url: "https://www.linkedin.com/in/ricardorubert/" },
          { label: "LOCATION", value: "Groningen, Netherlands" },
        ],
        availability: "▶ OPEN TO ANYTHING, CONTACT ME FOR MORE",
      },
    },

    // ── [3] SKILLS ──────────────────────────────────────────────
    // Add / remove categories and skills freely.
    // `level` is shown as a progress bar percentage (0–100).
    {
      type: "skills",
      glowColor: "#ff2200",
      label: "SKILLS.SYS",
      content: {
        heading: "SYSTEM CAPABILITIES",
        categories: [
          {
            name: "Machine Learning",
            skills: [
              { name: "PyTorch", level: 90 },
              { name: "Scikit-Learn", level: 85 },
              { name: "Model Training", level: 88 },
              { name: "Fine-tuning", level: 75 },
            ],
          },
          {
            name: "Programming",
            skills: [
              { name: "Python", level: 95 },
              { name: "Competitive Algo", level: 80 },
              { name: "Data Structures", level: 82 },
              { name: "SQL / Databases", level: 65 },
            ],
          },
          {
            name: "Tools",
            skills: [
              { name: "Jupyter / Colab", level: 90 },
              { name: "Git", level: 85 },
              { name: "Linux / CLI", level: 78 },
            ],
          },
        ],
      },
    },

    // ── [4] PROJECT 01 ──────────────────────────────────────────
    {
      type: "project",
      glowColor: "#00ff88",
      label: "PROJECT.01",
      content: {
        title: "Project Alpha",
        subtitle: "One-line pitch for your project",
        description:
          `Describe what the project does, what problem it solves,
and what you're most proud of technically.`,
        stack: ["Python", "PyTorch", "CUDA"],
        github: "https://github.com/YOURUSERNAME/project-alpha",
        demo: "",   // live demo URL, or leave ""
        year: "2024",
        competition: "",   // e.g. "1st Place — Kaggle XYZ", or leave ""
        image: "assets/images/p1.jpg",
        youtube: "https://www.youtube.com/watch?v=I_kRcwBWXYs",   // YouTube URL or leave ""
      },
    },

    // ── [5] PROJECT 02 ──────────────────────────────────────────
    {
      type: "project",
      glowColor: "#00ff88",
      label: "PROJECT.02",
      content: {
        title: "Project Beta",
        subtitle: "One-line pitch for your second project",
        description: `Describe what this project does and your role in it.`,
        stack: ["Python", "Scikit-Learn", "Pandas"],
        github: "https://github.com/YOURUSERNAME/project-beta",
        demo: "",
        year: "2024",
        competition: "",
        image: "assets/images/p2.jpg",
        youtube: "",
      },
    },

    // ── [6] PROJECT 03 (most prominent screen!) ─────────────────
    {
      type: "project",
      glowColor: "#00ff88",
      label: "PROJECT.03",
      content: {
        title: "Project Gamma",
        subtitle: "Your most impressive project goes here",
        description: `This is the most prominent screen — put your showpiece project here.`,
        stack: ["Python", "PyTorch", "HuggingFace"],
        github: "https://github.com/YOURUSERNAME/project-gamma",
        demo: "",
        year: "2024",
        competition: "1st Place — Some Competition",
        image: "assets/images/p3.jpg",
        youtube: "",
      },
    },

    // ── [7] PROJECT 04 ──────────────────────────────────────────
    {
      type: "project",
      glowColor: "#00ff88",
      label: "PROJECT.04",
      content: {
        title: "Project Delta",
        subtitle: "One-line pitch for your fourth project",
        description: `Describe this project.`,
        stack: ["Python", "NumPy", "Matplotlib"],
        github: "https://github.com/YOURUSERNAME/project-delta",
        demo: "",
        year: "2023",
        competition: "",
        image: "assets/images/p4.jpg",
        youtube: "",
      },
    },

    // ── [8] PROJECT 05 ──────────────────────────────────────────
    {
      type: "project",
      glowColor: "#00ff88",
      label: "PROJECT.05",
      content: {
        title: "Project Epsilon",
        subtitle: "One-line pitch for your fifth project",
        description: `Describe this project.`,
        stack: ["C++", "Algorithms", "Competitive"],
        github: "https://github.com/YOURUSERNAME/project-epsilon",
        demo: "",
        year: "2023",
        competition: "",
        image: "assets/images/p5.jpg",
        youtube: "",
      },
    },

  ], // end screens

}; // end PORTFOLIO_DATA
