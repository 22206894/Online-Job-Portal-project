require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const jobs = [
  // Tech
  ['Software Engineer', 'Design, build and maintain efficient, reusable, and reliable code. Collaborate with cross-functional teams.', 'JavaScript Python Git REST API Agile OOP Databases', 'Nicosia, Cyprus', 'KES 90,000 – 150,000'],
  ['Mobile Developer (Android)', 'Build native Android apps using Kotlin and Jetpack Compose for millions of users.', 'Kotlin Android Jetpack Compose REST API Git Firebase', 'Remote', 'KES 100,000 – 160,000'],
  ['Mobile Developer (iOS)', 'Develop and maintain iOS applications using Swift and SwiftUI.', 'Swift SwiftUI Xcode REST API Git Core Data', 'Remote', 'KES 100,000 – 160,000'],
  ['Cloud Engineer', 'Manage and optimise cloud infrastructure on AWS and GCP. Implement cost savings and security best practices.', 'AWS GCP Terraform Docker Kubernetes Linux CI/CD', 'Remote', 'KES 130,000 – 200,000'],
  ['Cybersecurity Analyst', 'Monitor networks for threats, conduct vulnerability assessments and respond to incidents.', 'Network Security SIEM Penetration Testing Firewalls Python Linux', 'Nicosia, Cyprus', 'KES 110,000 – 170,000'],
  ['Machine Learning Engineer', 'Build and deploy ML models for recommendation and fraud detection systems.', 'Python TensorFlow PyTorch Machine Learning SQL Docker AWS', 'Remote', 'KES 140,000 – 220,000'],
  ['QA Engineer', 'Write and execute test plans, automate testing pipelines, and ensure product quality.', 'Selenium Cypress Jest Python Test Automation CI/CD Agile', 'Nicosia, Cyprus', 'KES 70,000 – 110,000'],
  ['Blockchain Developer', 'Build smart contracts and decentralised applications on Ethereum and Solana.', 'Solidity Web3.js Ethereum Smart Contracts JavaScript Node.js', 'Remote', 'KES 150,000 – 250,000'],
  ['Database Administrator', 'Manage and optimise PostgreSQL and MySQL databases. Ensure uptime, backups and performance.', 'PostgreSQL MySQL Database Tuning Backup SQL Linux', 'Nicosia, Cyprus', 'KES 85,000 – 130,000'],
  ['Technical Support Engineer', 'Provide technical support to enterprise clients, troubleshoot issues and document solutions.', 'Troubleshooting Linux Networking Customer Support Ticketing Systems', 'Nicosia, Cyprus', 'KES 55,000 – 85,000'],
  ['IT Systems Administrator', 'Manage servers, networks and IT infrastructure for a 200-person company.', 'Windows Server Active Directory Networking VMware IT Support Linux', 'Nicosia, Cyprus', 'KES 70,000 – 110,000'],
  ['Network Engineer', 'Design and maintain enterprise network infrastructure, VPNs and firewalls.', 'Cisco Networking TCP/IP VPN Firewalls Routing Switching Linux', 'Nicosia, Cyprus', 'KES 90,000 – 140,000'],
  ['Embedded Systems Engineer', 'Develop firmware for IoT devices and embedded hardware products.', 'C C++ Embedded Systems RTOS Microcontrollers Hardware Debugging', 'Nicosia, Cyprus', 'KES 100,000 – 160,000'],
  ['Game Developer', 'Build mobile and PC games using Unity and Unreal Engine.', 'Unity C# Unreal Engine Game Design 3D Modelling Physics', 'Remote', 'KES 80,000 – 140,000'],
  ['AR/VR Developer', 'Build augmented and virtual reality experiences for education and enterprise training.', 'Unity ARKit ARCore WebXR 3D Modelling C# JavaScript', 'Remote', 'KES 120,000 – 190,000'],
  // Design
  ['Graphic Designer', 'Create visual content for digital and print media, including branding and social media.', 'Illustrator Photoshop InDesign Branding Typography Colour Theory', 'Nicosia, Cyprus', 'KES 50,000 – 80,000'],
  ['Motion Graphics Designer', 'Produce animated videos and motion graphics for campaigns and product explainers.', 'After Effects Premiere Pro Motion Graphics Animation Illustrator', 'Remote', 'KES 60,000 – 95,000'],
  ['Product Designer', 'Own the end-to-end design of product features from discovery to final UI.', 'Figma UX Research UI Design Prototyping User Testing Design Systems', 'Nicosia, Cyprus', 'KES 80,000 – 130,000'],
  ['Brand Designer', 'Define and evolve our brand identity across all touch points.', 'Branding Illustrator Figma Typography Visual Identity Marketing', 'Remote', 'KES 70,000 – 110,000'],
  ['3D Artist', 'Create 3D models, textures and animations for games and product visualisations.', 'Blender Maya 3D Modelling Texturing Rendering Animation', 'Remote', 'KES 65,000 – 105,000'],
  ['Interior Designer', 'Design functional and aesthetic interior spaces for commercial and residential clients.', 'AutoCAD SketchUp Interior Design Space Planning 3D Rendering Client Management', 'Nicosia, Cyprus', 'KES 55,000 – 90,000'],
  // Business & Finance
  ['Accountant', 'Manage financial records, prepare reports, handle tax filings and support audits.', 'Accounting Excel QuickBooks Tax Financial Reporting GAAP', 'Nicosia, Cyprus', 'KES 60,000 – 95,000'],
  ['Financial Analyst', 'Build financial models, analyse business performance and support strategic decisions.', 'Financial Modelling Excel PowerPoint Forecasting Budgeting SQL', 'Nicosia, Cyprus', 'KES 80,000 – 130,000'],
  ['Business Analyst', 'Gather requirements, analyse processes and translate business needs into technical specs.', 'Requirements Gathering SQL Business Analysis Process Mapping Agile', 'Nicosia, Cyprus', 'KES 75,000 – 120,000'],
  ['Project Manager', 'Lead cross-functional projects from initiation to delivery on time and within budget.', 'Project Management Agile Scrum Jira Communication Stakeholder Management', 'Nicosia, Cyprus', 'KES 90,000 – 150,000'],
  ['Operations Manager', 'Oversee daily operations, optimise processes and manage a team of 10+.', 'Operations Management Leadership Process Improvement Supply Chain Excel', 'Nicosia, Cyprus', 'KES 100,000 – 160,000'],
  ['Risk Analyst', 'Identify, assess and mitigate business and financial risks.', 'Risk Management Excel Financial Analysis Compliance Data Analysis Communication', 'Nicosia, Cyprus', 'KES 80,000 – 130,000'],
  ['Procurement Officer', 'Manage supplier relationships, negotiate contracts and oversee purchasing.', 'Procurement Supply Chain Negotiation Contract Management Excel ERP', 'Nicosia, Cyprus', 'KES 65,000 – 100,000'],
  ['Audit Associate', 'Conduct internal and external audits, review financial controls and prepare reports.', 'Auditing Accounting Excel Financial Controls Compliance Communication', 'Nicosia, Cyprus', 'KES 60,000 – 95,000'],
  // Marketing
  ['Digital Marketing Manager', 'Own performance marketing across Google Ads, Meta and TikTok.', 'Google Ads Meta Ads SEO Analytics Email Marketing Copywriting', 'Nicosia, Cyprus', 'KES 70,000 – 110,000'],
  ['Content Creator', 'Produce engaging video and written content for social media channels.', 'Video Editing Content Strategy Social Media Copywriting Photography', 'Remote', 'KES 45,000 – 75,000'],
  ['SEO Specialist', 'Improve organic search rankings through on-page, off-page and technical SEO.', 'SEO Google Analytics Ahrefs Technical SEO Content Writing Keyword Research', 'Remote', 'KES 55,000 – 85,000'],
  ['Social Media Manager', 'Create and schedule content, grow communities and report on social metrics.', 'Social Media Content Creation Analytics Community Management Copywriting', 'Remote', 'KES 50,000 – 80,000'],
  ['PR Officer', 'Manage media relations, press releases and the organisation public image.', 'Public Relations Writing Media Relations Communication Crisis Management', 'Nicosia, Cyprus', 'KES 60,000 – 95,000'],
  ['Email Marketing Specialist', 'Build and execute email campaigns, segment audiences and improve open rates.', 'Mailchimp Email Marketing Copywriting A/B Testing Analytics Segmentation', 'Remote', 'KES 50,000 – 80,000'],
  // Sales
  ['Sales Executive', 'Drive B2B sales by prospecting, pitching and closing deals with enterprise clients.', 'B2B Sales CRM Cold Calling Negotiation Communication Salesforce', 'Nicosia, Cyprus', 'KES 60,000 – 120,000'],
  ['Account Manager', 'Maintain and grow relationships with key accounts, identify upsell opportunities.', 'Account Management CRM Communication Client Relations Negotiation Excel', 'Nicosia, Cyprus', 'KES 70,000 – 110,000'],
  ['Business Development Manager', 'Identify and pursue new business opportunities, partnerships and markets.', 'Business Development Sales Strategy Networking Communication Market Research', 'Nicosia, Cyprus', 'KES 100,000 – 160,000'],
  ['Insurance Sales Agent', 'Sell life, health and general insurance products to individuals and businesses.', 'Sales Insurance Products CRM Communication Negotiation Customer Service', 'Nicosia, Cyprus', 'KES 40,000 – 80,000 + commission'],
  // HR
  ['HR Manager', 'Oversee recruitment, employee relations, performance management and HR policies.', 'HR Management Recruitment Employment Law Payroll Performance Management', 'Nicosia, Cyprus', 'KES 80,000 – 130,000'],
  ['Recruiter', 'Source and screen candidates for technical and non-technical roles.', 'Recruitment LinkedIn Sourcing Interviewing Communication ATS', 'Remote', 'KES 55,000 – 85,000'],
  ['Training & Development Officer', 'Design and deliver staff training programmes and learning pathways.', 'Training Facilitation Instructional Design LMS Communication Presentation', 'Nicosia, Cyprus', 'KES 60,000 – 95,000'],
  // Healthcare
  ['Clinical Officer', 'Provide outpatient care, diagnose conditions and prescribe treatment.', 'Clinical Skills Patient Care Diagnosis Medical Records Communication', 'Nicosia, Cyprus', 'KES 60,000 – 100,000'],
  ['Pharmacist', 'Dispense medication, counsel patients and ensure pharmacy compliance.', 'Pharmacy Drug Interactions Patient Counselling Inventory Management', 'Limassol, Cyprus', 'KES 80,000 – 120,000'],
  ['Nurse', 'Deliver high-quality nursing care in a hospital across medical and surgical wards.', 'Nursing Patient Care Vital Signs Medical Records IV Administration', 'Larnaca, Cyprus', 'KES 50,000 – 85,000'],
  ['Lab Technician', 'Process and analyse biological samples, maintain lab equipment and report results.', 'Laboratory Skills Sample Processing Quality Control Lab Equipment Reporting', 'Nicosia, Cyprus', 'KES 45,000 – 75,000'],
  ['Nutritionist', 'Provide dietary advice and nutrition plans for patients and corporate wellness clients.', 'Nutrition Dietetics Counselling Meal Planning Health Education Communication', 'Nicosia, Cyprus', 'KES 50,000 – 80,000'],
  ['Public Health Officer', 'Implement public health programmes, conduct community outreach and monitor disease.', 'Public Health Epidemiology Community Health Data Analysis Communication', 'Nicosia, Cyprus', 'KES 55,000 – 90,000'],
  // Education
  ['Teacher - Mathematics', 'Teach mathematics to secondary school students, prepare lesson plans and assessments.', 'Mathematics Teaching Lesson Planning Curriculum CBC Assessment', 'Nicosia, Cyprus', 'KES 35,000 – 60,000'],
  ['Teacher - Sciences', 'Teach Biology, Chemistry and Physics to Form 1–4 students.', 'Science Teaching Biology Chemistry Physics CBC Lesson Planning', 'Paphos, Cyprus', 'KES 35,000 – 60,000'],
  ['E-Learning Developer', 'Design and build online courses using authoring tools and LMS platforms.', 'Articulate Storyline Moodle Instructional Design eLearning Video Editing', 'Remote', 'KES 55,000 – 90,000'],
  ['University Lecturer', 'Deliver undergraduate lectures, supervise research and publish academic work.', 'Research Academic Writing Teaching Communication PhD Subject Expertise', 'Nicosia, Cyprus', 'KES 100,000 – 170,000'],
  // Legal
  ['Legal Officer', 'Draft contracts, review agreements and provide legal advisory to the business.', 'Contract Law Legal Research Drafting Compliance Communication', 'Nicosia, Cyprus', 'KES 90,000 – 140,000'],
  ['Compliance Officer', 'Ensure the organisation adheres to regulations, policies and legal requirements.', 'Compliance Risk Management Regulatory Affairs AML KYC Reporting', 'Nicosia, Cyprus', 'KES 80,000 – 130,000'],
  ['Paralegal', 'Support lawyers with research, document preparation and case management.', 'Legal Research Document Drafting Case Management Communication Microsoft Office', 'Nicosia, Cyprus', 'KES 45,000 – 70,000'],
  // Logistics & Supply Chain
  ['Logistics Coordinator', 'Coordinate shipments, manage relationships with carriers and track deliveries.', 'Logistics Supply Chain Excel ERP Communication Problem Solving', 'Limassol, Cyprus', 'KES 50,000 – 80,000'],
  ['Warehouse Manager', 'Manage warehouse operations, inventory control and a team of 20+ staff.', 'Warehouse Management Inventory Control Leadership ERP Health and Safety', 'Nicosia, Cyprus', 'KES 70,000 – 110,000'],
  ['Supply Chain Analyst', 'Analyse supply chain data, identify inefficiencies and recommend improvements.', 'Supply Chain SQL Excel Data Analysis ERP Forecasting Communication', 'Nicosia, Cyprus', 'KES 70,000 – 110,000'],
  // Agriculture
  ['Agronomist', 'Advise farmers on crop production, soil management and pest control.', 'Agronomy Soil Science Crop Production Pest Management Field Research', 'Larnaca, Cyprus', 'KES 55,000 – 85,000'],
  ['Agricultural Extension Officer', 'Train smallholder farmers on modern farming techniques and input use.', 'Agriculture Extension Services Training Communication Farming Techniques', 'Famagusta, Cyprus', 'KES 40,000 – 65,000'],
  // Media & Communication
  ['Journalist', 'Research, write and broadcast news stories across digital and print platforms.', 'Journalism Writing Research Interviewing Media Ethics Communication', 'Nicosia, Cyprus', 'KES 50,000 – 85,000'],
  ['Video Producer', 'Produce video content for corporate clients, including shooting and editing.', 'Video Production Premiere Pro After Effects Directing Camera Operation', 'Nicosia, Cyprus', 'KES 60,000 – 100,000'],
  ['Copywriter', 'Write compelling copy for ads, websites, emails and marketing campaigns.', 'Copywriting SEO Writing Content Marketing Editing Communication', 'Remote', 'KES 50,000 – 85,000'],
  // Customer Service
  ['Customer Service Representative', 'Handle customer enquiries, complaints and support requests via phone and chat.', 'Customer Service Communication CRM Problem Solving Patience Empathy', 'Nicosia, Cyprus', 'KES 35,000 – 55,000'],
  ['Call Centre Supervisor', 'Lead a team of agents, monitor KPIs and improve service quality.', 'Call Centre Leadership Coaching CRM Reporting Performance Management', 'Nicosia, Cyprus', 'KES 55,000 – 85,000'],
  // Engineering (Non-IT)
  ['Civil Engineer', 'Design and oversee construction of roads, buildings and infrastructure.', 'Civil Engineering AutoCAD Structural Analysis Project Management Construction', 'Nicosia, Cyprus', 'KES 90,000 – 150,000'],
  ['Mechanical Engineer', 'Design and maintain mechanical systems and equipment for manufacturing plants.', 'Mechanical Engineering AutoCAD SolidWorks Manufacturing Maintenance Problem Solving', 'Nicosia, Cyprus', 'KES 85,000 – 140,000'],
  ['Electrical Engineer', 'Design electrical systems for commercial and industrial buildings.', 'Electrical Engineering AutoCAD Power Systems Control Systems Project Management', 'Nicosia, Cyprus', 'KES 90,000 – 150,000'],
  ['Environmental Engineer', 'Develop solutions for environmental challenges, conduct impact assessments.', 'Environmental Engineering EIA Water Treatment GIS Regulations Report Writing', 'Nicosia, Cyprus', 'KES 80,000 – 130,000'],
  // Hospitality & Tourism
  ['Hotel Manager', 'Oversee all hotel operations, staff management and guest experience.', 'Hospitality Management Customer Service Leadership Budgeting Operations', 'Limassol, Cyprus', 'KES 90,000 – 150,000'],
  ['Chef', 'Prepare high-quality meals, manage kitchen operations and train junior chefs.', 'Culinary Arts Kitchen Management Menu Planning Food Safety Team Leadership', 'Nicosia, Cyprus', 'KES 50,000 – 90,000'],
  ['Tour Guide', 'Lead tourist groups, share knowledge of local culture, history and wildlife.', 'Tourism Local Knowledge Communication Languages Customer Service First Aid', 'Nicosia, Cyprus', 'KES 35,000 – 60,000'],
];

async function seed() {
  const emp = await pool.query('SELECT id FROM users WHERE firebase_uid = $1', ['demo_employer_1']);
  const empId = emp.rows[0].id;
  let count = 0;
  for (const j of jobs) {
    await pool.query(
      'INSERT INTO jobs (employer_id, title, description, requirements, location, salary, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [empId, j[0], j[1], j[2], j[3], j[4], 'open']
    );
    count++;
  }
  console.log('Seeded', count, 'jobs total');
  pool.end();
}
seed().catch(e => { console.error(e.message); pool.end(); });
