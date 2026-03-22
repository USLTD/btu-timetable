import { renderRichText } from "@/lib/i18n";
import * as m from "@/paraglide/messages";

export function PrivacyPolicy() {
  return (
    <div class={styles.wrap}>
      <p class={styles.meta}>
        {m.document_effective_date()}
      </p>
      <p>
        {renderRichText(m.privacy_service_intro(), [
          <a
            key="privacy-site"
            href="https://timetable.usltd.ge"
            class={styles.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="timetable.usltd.ge"
          >
            timetable.usltd.ge
          </a>,
        ])}
      </p>
      <h3 class={styles.heading}>
        {m.information_we_collect()}
      </h3>
      <p>
        {renderRichText(m.privacy_no_personal_data(), [<strong key="privacy-no-data" />])}
      </p>
      <ul class={styles.list}>
        <li>
          {m.privacy_no_personal_identifiers()}
        </li>
        <li>
          {m.privacy_no_analytics()}
        </li>
        <li>
          {renderRichText(m.privacy_local_processing(), [<strong key="privacy-local-processing" />])}
        </li>
      </ul>
      <h3 class={styles.heading}>
        {m.local_storage_and_pwa_caching()}
      </h3>
      <p>
        {m.privacy_local_storage()}
      </p>
      <h3 class={styles.heading}>
        {m.third_party_services()}
      </h3>
      <ul class={styles.list}>
        <li>
          {renderRichText(m.privacy_hosting_disclosure(), [<strong key="privacy-hosting" />])}
        </li>
        <li>
          {m.privacy_no_tracking()}
        </li>
      </ul>
      <h3 class={styles.heading}>
        {m.children_s_privacy()}
      </h3>
      <p>
        {m.privacy_audience()}
      </p>
      <h3 class={styles.heading}>
        {m.changes_to_this_policy()}
      </h3>
      <p>
        {m.privacy_changes_body()}
      </p>
      <h3 class={styles.heading}>
        {m.contact_us()}
      </h3>
      <p>
        {renderRichText(m.support_issue_link_or_email(), [
          <a
            key="privacy-issue"
            href="https://github.com/USLTD/btu-timetable/issues"
            class={styles.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="github.com/USLTD/btu-timetable/issues"
          >
            github.com/USLTD/btu-timetable/issues
          </a>,
        ])}
      </p>
      <p class={styles.footerNote}>
        {m.privacy_policy_last_updated()}
      </p>
    </div>
  );
}

const styles = {
  wrap: "space-y-4",
  meta: "italic text-gray-500 dark:text-gray-400",
  heading: "font-bold text-base text-gray-800 dark:text-gray-100",
  list: "list-disc pl-5 space-y-1",
  link: "text-blue-500 underline",
  footerNote: "italic text-xs text-gray-500 dark:text-gray-400",
};
