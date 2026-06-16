export const metadata = {
  title: "Referral Terms & Conditions — MyCBCT",
  description: "Terms and conditions for referring patients through the MyCBCT online referral portal.",
};

export default function TermsPage() {
  return (
    <main className="tm">
      <div className="tm-inner">
        <a className="tm-back" href="/sign-in">&larr; Back to sign in</a>

        <header className="tm-head">
          <p className="tm-sub">360 Visualise — Online Referral Portal</p>
          <h1 className="tm-h1">Referral Terms &amp; Conditions</h1>
        </header>

        <section className="tm-card">
          <h2 className="tm-h2">1. Referral Agreement</h2>
          <ul className="tm-list">
            <li>
              Following the IRMER17 guidelines a referrer is defined as a registered medical
              practitioner, dental practitioner or other registered healthcare professional
              (e.g. Hygienist or therapist) who is entitled to refer individuals to an IRMER
              practitioner for medical (or non medical) exposure.
            </li>
            <li>
              The referring practitioner accepts responsibility to ensure that they are competent
              and adequately trained to refer for OPG/CBCT.
            </li>
            <li>
              The referrer is responsible for ensuring that sufficient clinical information is
              provided to enable the exposure to be justified.
            </li>
            <li>
              The referring practitioner is working under the guidelines and regulations of IRR17
              and the ALARP principle.
            </li>
            <li>
              Each referral must include: unique identification of the patient and referrer, clinical
              information to justify the exposure, and the date of the referral.
            </li>
            <li>
              If the clinical information is not enough for the exposure to be justified it will be
              returned to the referrer.
            </li>
            <li>We do not accept referrals for patients under 16 years old.</li>
          </ul>
        </section>

        <section className="tm-card">
          <h2 className="tm-h2">2. Reporting and Interpreting Agreement</h2>
          <ul className="tm-list">
            <li>
              360 Visualise do not report on CBCT scans or x-rays as a matter of standard procedure.
            </li>
            <li>
              360 Visualise can arrange for scans and x-rays to be reported on by a consultant
              radiologist.
            </li>
            <li>
              The referrer/prescriber accepts responsibility for making arrangements for all
              radiographs and CBCT scans to be interpreted and reported on.
            </li>
            <li>
              The referrer/prescriber accepts the responsibility to ensure that they are competent
              and adequately trained to interpret/report, and that their training remains current.
            </li>
          </ul>
        </section>

        <section className="tm-card">
          <h2 className="tm-h2">3. Data Protection</h2>
          <p className="tm-p">
            360 Visualise Limited processes patient data in accordance with UK GDPR and the Data
            Protection Act 2018. Patient data is used solely for the purpose of providing the
            requested imaging service and will not be shared with third parties without consent,
            except where required by law.
          </p>
        </section>

        <section className="tm-card">
          <h2 className="tm-h2">4. Payment &amp; DNA Policy</h2>
          <p className="tm-p">
            Payment for all scans is due on the day of the appointment. In the event that a patient
            does not attend (DNA) their appointment without providing at least 24 hours notice, a
            cancellation fee of &pound;25 may be charged to the referring practice. We understand
            that circumstances change and will always try to be reasonable &mdash; please contact us
            as soon as possible if your patient is unable to attend.
          </p>
        </section>
      </div>

      <style>{`
        .tm{min-height:100vh;background:#0e1b2e;color:#f7f4ec;
          font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
          padding:40px 24px 80px;}
        .tm-inner{max-width:760px;margin:0 auto;}
        .tm-back{display:inline-block;color:rgba(247,244,236,.6);text-decoration:none;
          font-size:14px;margin-bottom:24px;}
        .tm-back:hover{color:#e7ae3b;}
        .tm-head{margin-bottom:28px;}
        .tm-sub{margin:0 0 10px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;
          color:#e7ae3b;font-weight:600;}
        .tm-h1{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:clamp(28px,5vw,34px);
          margin:0;line-height:1.2;}
        .tm-card{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.08);
          border-radius:16px;padding:24px 26px;margin-bottom:18px;}
        .tm-h2{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:18px;
          margin:0 0 14px;color:#e7ae3b;}
        .tm-p{margin:0;font-size:15px;line-height:1.65;color:rgba(247,244,236,.88);}
        .tm-list{margin:0;padding-left:20px;font-size:15px;line-height:1.65;
          color:rgba(247,244,236,.88);}
        .tm-list li + li{margin-top:10px;}
      `}</style>
    </main>
  );
}
