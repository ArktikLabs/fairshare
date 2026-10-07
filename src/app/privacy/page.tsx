import { LegalPage } from "@/components/site/legal-page";

export const metadata = { title: "Privacy · FairShare" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="8 October 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          FairShare is operated by Arktik. If you have a question about your data, email{" "}
          <a href="mailto:hello@arktik.id">hello@arktik.id</a>.
        </p>
      </section>
      <section>
        <h2>What we store</h2>
        <ul>
          <li>Your account: name, email address, a hashed password (if you set one) and passkey public keys.</li>
          <li>Your preferences: default currency and time zone.</li>
          <li>What you and your groups enter: groups, members, invitations, expenses, splits, notes and recorded payments.</li>
          <li>People you invite: their email address, so we can send the invitation and show them on expenses.</li>
          <li>Technical session data needed to keep you signed in.</li>
        </ul>
      </section>
      <section>
        <h2>Where it is stored</h2>
        <p>
          Data is stored in a database on our own servers. We do not sell your data and we do not use it for
          advertising.
        </p>
      </section>
      <section>
        <h2>Email</h2>
        <p>
          We send transactional email (invitations, password resets) through Resend, which processes the recipient
          address and message content only to deliver it.
        </p>
      </section>
      <section>
        <h2>Cookies and analytics</h2>
        <p>
          We use only the cookies needed to sign you in. We do not run analytics or tracking scripts at this time. If
          that changes, we will update this page first.
        </p>
      </section>
      <section>
        <h2>Who can see your data</h2>
        <p>
          Members of a group can see that group&apos;s members, expenses, balances and payments. Nobody else can. Arktik
          staff access data only to operate the service or when you ask us to.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <ul>
          <li>Download all your data from Account → Your data → Download export.</li>
          <li>
            Delete your account from Account → Your data. Your personal details are removed; shared expenses stay for
            the other members and show you as &quot;Deleted user&quot;.
          </li>
          <li>Email us for anything else, including corrections.</li>
        </ul>
      </section>
    </LegalPage>
  );
}
