export const metadata = {
  title: "MyCBCT — Staff Guide",
  description: "Staff guide for managing patients and appointments in the MyCBCT portal.",
};

const STAFF_GUIDE_HTML = `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .sg-root {
    font-family: Georgia, serif;
    background: #f0ede6;
    color: #1a1a1a;
    line-height: 1.7;
    font-size: 17px;
  }

  .cover {
    background: #0e1b2e;
    color: #f7f4ec;
    padding: 80px 40px;
    text-align: center;
    min-height: 340px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .cover-sub {
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    margin-bottom: 12px;
  }
  .cover-logo {
    font-size: 48px;
    font-weight: 700;
    color: #e7ae3b;
    margin-bottom: 8px;
    letter-spacing: -1px;
  }
  .cover-tagline {
    font-size: 18px;
    color: rgba(247,244,236,0.65);
    margin-bottom: 32px;
  }
  .cover-divider {
    width: 60px;
    height: 2px;
    background: #e7ae3b;
    margin: 0 auto 32px;
  }
  .cover-title {
    font-size: 30px;
    font-weight: 600;
    color: #f7f4ec;
    margin-bottom: 12px;
  }
  .cover-desc {
    font-size: 16px;
    color: rgba(247,244,236,0.55);
    max-width: 480px;
  }

  .reassurance {
    background: #e7ae3b;
    padding: 24px 40px;
    text-align: center;
  }
  .reassurance p {
    font-size: 16px;
    color: #0e1b2e;
    font-weight: 600;
    margin: 0;
  }

  .content {
    max-width: 780px;
    margin: 0 auto;
    padding: 60px 40px;
  }

  .section {
    margin-bottom: 64px;
  }

  .section-number {
    display: inline-block;
    background: #e7ae3b;
    color: #0e1b2e;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 4px 14px;
    border-radius: 999px;
    margin-bottom: 14px;
  }

  .section-title {
    font-size: 28px;
    font-weight: 700;
    color: #0e1b2e;
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .section-intro {
    font-size: 16px;
    color: #555;
    margin-bottom: 28px;
    max-width: 580px;
  }

  .steps {
    list-style: none;
    counter-reset: steps;
  }

  .step {
    counter-increment: steps;
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    align-items: flex-start;
  }

  .step-num {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    background: #0e1b2e;
    color: #e7ae3b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 16px;
    font-weight: 700;
    margin-top: 2px;
  }

  .step-body {
    flex: 1;
    background: #fff;
    border-radius: 12px;
    padding: 18px 22px;
    border-left: 4px solid #e7ae3b;
  }

  .step-body strong {
    display: block;
    font-size: 17px;
    color: #0e1b2e;
    margin-bottom: 6px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }

  .step-body p {
    font-size: 15px;
    color: #444;
    margin: 0;
    line-height: 1.6;
  }

  .tip {
    background: rgba(231,174,59,0.12);
    border: 1px solid rgba(231,174,59,0.4);
    border-radius: 12px;
    padding: 18px 22px;
    margin-top: 20px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .tip-icon {
    font-size: 22px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .tip p {
    font-size: 15px;
    color: #555;
    margin: 0;
    line-height: 1.6;
  }

  .tip strong {
    color: #0e1b2e;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }

  .dont-worry {
    background: #0e1b2e;
    border-radius: 12px;
    padding: 20px 24px;
    margin-top: 20px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .dont-worry p {
    font-size: 15px;
    color: rgba(247,244,236,0.8);
    margin: 0;
    line-height: 1.6;
  }

  .dont-worry strong {
    color: #e7ae3b;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }

  .divider {
    height: 1px;
    background: #ddd9d0;
    margin: 64px 0;
  }

  .quick-ref {
    background: #0e1b2e;
    border-radius: 16px;
    padding: 36px 40px;
    margin-bottom: 64px;
  }

  .quick-ref h2 {
    font-size: 22px;
    color: #e7ae3b;
    margin-bottom: 24px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 700;
  }

  .quick-ref-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .quick-ref-item {
    background: rgba(247,244,236,0.06);
    border-radius: 10px;
    padding: 16px 18px;
  }

  .quick-ref-item .label {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(247,244,236,0.4);
    font-family: 'Helvetica Neue', Arial, sans-serif;
    margin-bottom: 6px;
  }

  .quick-ref-item .value {
    font-size: 15px;
    color: #f7f4ec;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 600;
  }

  .quick-ref-item .value a {
    color: #e7ae3b;
    text-decoration: none;
  }

  .glossary-item {
    display: flex;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid #ddd9d0;
    align-items: flex-start;
  }

  .glossary-item:last-child {
    border-bottom: none;
  }

  .glossary-term {
    flex-shrink: 0;
    width: 140px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #0e1b2e;
    padding-top: 2px;
  }

  .glossary-def {
    font-size: 15px;
    color: #555;
    line-height: 1.6;
  }

  .footer {
    background: #0e1b2e;
    padding: 40px;
    text-align: center;
  }

  .footer p {
    font-size: 13px;
    color: rgba(247,244,236,0.35);
    margin: 0;
  }

  .footer .logo {
    font-size: 20px;
    color: #e7ae3b;
    margin-bottom: 8px;
    font-weight: 700;
  }

  .button-example {
    display: inline-block;
    background: #e7ae3b;
    color: #0e1b2e;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 700;
    font-size: 15px;
    padding: 10px 24px;
    border-radius: 999px;
    margin: 4px 0;
    text-decoration: none;
  }

  .button-example.dark {
    background: #0e1b2e;
    color: #e7ae3b;
  }

  .button-example.outline {
    background: none;
    border: 2px solid #0e1b2e;
    color: #0e1b2e;
  }

  @media (max-width: 600px) {
    .content { padding: 40px 20px; }
    .quick-ref-grid { grid-template-columns: 1fr; }
    .cover { padding: 60px 24px; }
    .cover-logo { font-size: 36px; }
    .cover-title { font-size: 24px; }
  }
</style>

<div class="sg-root">

<div class="cover">
  <p class="cover-sub">By 360 Visualise</p>
  <p class="cover-logo">MyCBCT</p>
  <p class="cover-tagline">The CBCT referral portal</p>
  <div class="cover-divider"></div>
  <h1 class="cover-title">Staff Guide</h1>
  <p class="cover-desc">Everything you need to know to manage patients and appointments — explained simply, step by step.</p>
</div>

<div class="reassurance">
  <p>💛 &nbsp; Don't worry — you cannot break anything. If something goes wrong, just call Pete or Rachel.</p>
</div>

<div class="content">

  <div class="section">
    <p style="font-size:19px;color:#333;line-height:1.8;margin-bottom:20px;">
      Welcome to MyCBCT! This is the system we use to manage all our CBCT scan referrals — from when a dentist sends us a patient, right through to when the scan is done and delivered.
    </p>
    <p style="font-size:19px;color:#333;line-height:1.8;margin-bottom:20px;">
      <strong>Your job in the system</strong> is mainly to look at the list of patients waiting, ring them up to arrange their appointment, and book them in. That's it!
    </p>
    <div class="tip">
      <span class="tip-icon">🌟</span>
      <p><strong>The golden rule:</strong> if you're ever not sure what to do, just leave it as it is and ask Rachel. Nothing in this system is urgent and nothing will go wrong if you leave a patient for a bit.</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <span class="section-number">Step 1</span>
    <h2 class="section-title">How to log in</h2>
    <p class="section-intro">You'll need to do this every time you use the system. It only takes a moment.</p>

    <ol class="steps">
      <li class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <strong>Open your internet browser</strong>
          <p>That's the app you use to look at websites — it might be called Safari, Chrome, or Edge. Click on it to open it.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <strong>Go to the website</strong>
          <p>Click in the address bar at the top of the screen (the long white box) and type: <strong>mycbct-portal.vercel.app</strong> — then press Enter.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <strong>Type in your email address and password</strong>
          <p>Enter the email address and password Rachel gave you. Then click the big <span class="button-example" style="font-size:13px;padding:6px 16px;">Sign in</span> button.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">4</div>
        <div class="step-body">
          <strong>You're in! 🎉</strong>
          <p>You'll see the dashboard — a list of patients waiting. This is where you'll spend most of your time.</p>
        </div>
      </li>
    </ol>

    <div class="dont-worry">
      <span style="font-size:22px;flex-shrink:0;">🔐</span>
      <p><strong>Can't log in?</strong> Don't panic. Double-check you've typed your email and password correctly — passwords are case-sensitive, so make sure Caps Lock isn't on. If it still won't work, ask Rachel to reset your password.</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <span class="section-number">Step 2</span>
    <h2 class="section-title">Understanding the dashboard</h2>
    <p class="section-intro">When you log in, you'll see the main screen. Here's what everything means.</p>

    <ol class="steps">
      <li class="step">
        <div class="step-num">📋</div>
        <div class="step-body">
          <strong>The Action Queue — your main list</strong>
          <p>This is the list of patients who are waiting for a scan. You can see their name, what type of scan they need, and how long they've been waiting. The ones who've been waiting the longest are shown with a red badge — try to call those ones first.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">📊</div>
        <div class="step-body">
          <strong>The numbers at the top</strong>
          <p>You'll see three boxes showing how many patients are waiting, how many referrals came in this week, and how many scans have been uploaded. Don't worry too much about these — they're just useful to know.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">🔍</div>
        <div class="step-body">
          <strong>Finding a specific patient</strong>
          <p>If you need to find a particular patient, look for a search box at the top of the list. Type their name and they'll appear straight away.</p>
        </div>
      </li>
    </ol>

    <div class="tip">
      <span class="tip-icon">💡</span>
      <p><strong>Tip:</strong> You only need to worry about patients with a <span class="button-example" style="font-size:12px;padding:4px 14px;">Book →</span> button next to them. Those are the ones waiting to be booked in.</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <span class="section-number">Step 3</span>
    <h2 class="section-title">Opening a patient's record</h2>
    <p class="section-intro">To see all the details about a patient — their contact number, what scan they need, and notes from their dentist — click on their name.</p>

    <ol class="steps">
      <li class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <strong>Click on the patient's name</strong>
          <p>Just click once on their name in the list. Their full record will open.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <strong>You'll see all their details</strong>
          <p>This includes: their scan type, date of birth, clinical notes from their dentist, and their contact details (phone number and email) if we have them.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <strong>Adding or updating contact details</strong>
          <p>If you've spoken to a patient and need to add or update their phone number or email address, scroll down to the <strong>Patient contact</strong> section. Type in the details and click <span class="button-example" style="font-size:12px;padding:5px 14px;">Save contact details</span>.</p>
        </div>
      </li>
    </ol>

    <div class="dont-worry">
      <span style="font-size:22px;flex-shrink:0;">😊</span>
      <p><strong>Go back at any time:</strong> If you want to go back to the main list, just click the <strong style="color:#e7ae3b;">← Back to dashboard</strong> link at the top of the page. Easy!</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <span class="section-number">Step 4</span>
    <h2 class="section-title">Booking a patient's appointment</h2>
    <p class="section-intro">Once you've spoken to a patient and agreed a date and time with them, here's how to book it in.</p>

    <ol class="steps">
      <li class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <strong>Open the patient's record</strong>
          <p>Find the patient in the list and click on their name to open their record (as above).</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <strong>Click "Book appointment"</strong>
          <p>You'll see a gold strip near the top saying "No appointment booked yet." Click the <span class="button-example" style="font-size:12px;padding:5px 14px;">Book appointment</span> button on the right.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <strong>Pick the date and time</strong>
          <p>A calendar will appear showing available slots. Click on the date and time that the patient agreed to. Available slots are shown in gold.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">4</div>
        <div class="step-body">
          <strong>Confirm the booking</strong>
          <p>Click the <span class="button-example" style="font-size:12px;padding:5px 14px;">Confirm booking</span> button. The appointment is now booked!</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">5</div>
        <div class="step-body">
          <strong>The patient gets an email automatically 📧</strong>
          <p>As soon as you confirm the booking, the system automatically sends the patient a lovely confirmation email with their appointment time, our address, directions, and everything they need to know. You don't need to do anything else!</p>
        </div>
      </li>
    </ol>

    <div class="tip">
      <span class="tip-icon">📅</span>
      <p><strong>No slots available?</strong> If there are no available slots showing, it means Rachel hasn't added any yet. Let her know and she'll add some to the diary.</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <span class="section-number">Step 5</span>
    <h2 class="section-title">What to do if a patient no longer needs a scan</h2>
    <p class="section-intro">Sometimes when you ring a patient, they might say they've already had their scan done elsewhere, or they don't want it anymore. That's fine — you can remove them from the list.</p>

    <ol class="steps">
      <li class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <strong>Open the patient's record</strong>
          <p>Find them in the list and click their name.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <strong>Scroll to the bottom and click "Archive referral"</strong>
          <p>You'll see a button at the very bottom of the page with a red outline that says <span style="display:inline-block;border:1px solid #ff9b9b;color:#ff9b9b;font-size:13px;padding:4px 14px;border-radius:999px;font-family:sans-serif;">Archive referral</span>. Click it.</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <strong>Choose the reason</strong>
          <p>A small box will pop up asking why you're archiving it. Choose the reason that fits best from the list — for example "Already scanned elsewhere" or "Patient declined".</p>
        </div>
      </li>
      <li class="step">
        <div class="step-num">4</div>
        <div class="step-body">
          <strong>Click "Archive"</strong>
          <p>The patient will disappear from the main list. Don't worry — their record isn't deleted, it's just moved out of the way. Rachel can always find it again if needed.</p>
        </div>
      </li>
    </ol>

    <div class="dont-worry">
      <span style="font-size:22px;flex-shrink:0;">🗂️</span>
      <p><strong>Nothing is ever deleted:</strong> Archiving just moves the patient off the active list. Their record is always kept safely in the system. If you archive someone by mistake, just tell Rachel and she can sort it out.</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="quick-ref">
    <h2>📌 Quick Reference</h2>
    <div class="quick-ref-grid">
      <div class="quick-ref-item">
        <div class="label">Website address</div>
        <div class="value">mycbct-portal.vercel.app</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">Phone number to give patients</div>
        <div class="value">01943 601222</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">Address to give patients</div>
        <div class="value" style="font-size:13px;line-height:1.5;">360 Visualise, Octagon House,<br>Bradford Road, Sandbeds,<br>West Yorkshire BD20 5LY</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">What to tell patients about parking</div>
        <div class="value" style="font-size:13px;">Free parking on site</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">How long is the appointment?</div>
        <div class="value">Around 15 minutes</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">What should patients remove?</div>
        <div class="value" style="font-size:13px;">Earrings, glasses, hairpins</div>
      </div>
      <div class="quick-ref-item">
        <div class="label">Problems? Contact</div>
        <div class="value"><a href="mailto:pete@360v.co.uk">Pete or Rachel</a></div>
      </div>
      <div class="quick-ref-item">
        <div class="label">Patient email address</div>
        <div class="value"><a href="mailto:hello@mycbct.co.uk">hello@mycbct.co.uk</a></div>
      </div>
    </div>
  </div>

  <div class="section">
    <span class="section-number">Glossary</span>
    <h2 class="section-title">What do these words mean?</h2>
    <p class="section-intro">Some words in the system might be unfamiliar. Here's a plain English explanation of each one.</p>

    <div class="glossary-item">
      <div class="glossary-term">Referral</div>
      <div class="glossary-def">This is when a dentist sends us a patient for a scan. Each patient in our list is a "referral".</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Dashboard</div>
      <div class="glossary-def">The main screen you see when you log in — your list of patients to deal with.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Action Queue</div>
      <div class="glossary-def">The list of patients who need something doing — usually ringing them up to book an appointment.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">CBCT Scan</div>
      <div class="glossary-def">The type of 3D X-ray scan we do here. It stands for Cone Beam Computed Tomography — but you don't need to remember that!</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Submitted</div>
      <div class="glossary-def">The dentist has sent us the referral, but we haven't booked the patient in yet.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Booked</div>
      <div class="glossary-def">The patient has an appointment in the diary.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Scanned</div>
      <div class="glossary-def">The patient has come in and had their scan done.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Archive</div>
      <div class="glossary-def">Moving a patient off the active list because they no longer need a scan. Their record is kept but they won't appear in the main list.</div>
    </div>
    <div class="glossary-item">
      <div class="glossary-term">Report requested</div>
      <div class="glossary-def">The dentist has asked for a written report from a specialist along with the scan. You don't need to do anything different — just be aware some scans have this.</div>
    </div>
  </div>

  <div style="background:#f7f4ec;border:2px solid #e7ae3b;border-radius:16px;padding:32px 36px;text-align:center;margin-bottom:40px;">
    <p style="font-size:28px;margin-bottom:12px;">😊</p>
    <h3 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:20px;color:#0e1b2e;margin-bottom:12px;">You're doing brilliantly.</h3>
    <p style="font-size:16px;color:#555;line-height:1.7;max-width:480px;margin:0 auto;">Remember — you cannot break anything. If you're ever unsure, just ask Rachel or Pete. Everyone here is on hand to help, and no question is ever a silly one.</p>
  </div>

</div>

<div class="footer">
  <p class="logo">MyCBCT</p>
  <p>By 360 Visualise &nbsp;·&nbsp; Octagon House, Bradford Road, Sandbeds, West Yorkshire BD20 5LY &nbsp;·&nbsp; 01943 601222</p>
</div>

</div>
`;

export default function StaffGuidePage() {
  return <div dangerouslySetInnerHTML={{ __html: STAFF_GUIDE_HTML }} />;
}
