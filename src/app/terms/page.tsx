import { LegalPage } from "@/components/site/legal-page";

export const metadata = { title: "Terms · FairShare" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="8 October 2026">
      <section>
        <h2>The service</h2>
        <p>
          FairShare is a free tool, operated by Arktik, for recording shared expenses and working out who owes whom. It
          does not move money: payments you record are notes about payments made elsewhere.
        </p>
      </section>
      <section>
        <h2>Your account</h2>
        <ul>
          <li>Give a real email address and keep your sign-in details safe.</li>
          <li>You are responsible for what you enter, including the email addresses of people you invite.</li>
          <li>Only invite people who expect to hear from you.</li>
        </ul>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          Do not use FairShare to send spam, to harass anyone, to break the law or to try to access other people&apos;s
          groups. We may suspend accounts that do.
        </p>
      </section>
      <section>
        <h2>No guarantee</h2>
        <p>
          We work to keep balances correct and the service available, but FairShare is provided as is. Check important
          amounts yourself before paying. To the extent the law allows, Arktik is not liable for losses from using the
          service.
        </p>
      </section>
      <section>
        <h2>Changes and ending</h2>
        <p>
          We may change these terms or the service; material changes are announced on this page. You can stop using
          FairShare and delete your account at any time from the Account page.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Arktik · <a href="mailto:hello@arktik.id">hello@arktik.id</a>
        </p>
      </section>
    </LegalPage>
  );
}
