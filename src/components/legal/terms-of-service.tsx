import { renderRichText } from "@/lib/i18n";
import * as m from "@/paraglide/messages";

export function TermsOfService() {
  return (
    <div class={styles.wrap}>
      <p class={styles.meta}>
        {m.document_effective_date()}
      </p>
      <p>
        {renderRichText(m.terms_service_intro(), [
          <a
            key="terms-site"
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
        {m.acceptance_of_terms()}
      </h3>
      <p>
        {m.terms_acceptance_body()}
      </p>
      <h3 class={styles.heading}>
        {m.description_of_service()}
      </h3>
      <p>
        {m.terms_service_description()}
      </p>
      <h3 class={styles.heading}>
        {m.user_responsibilities()}
      </h3>
      <ul class={styles.list}>
        <li>
          {m.terms_user_responsibility()}
        </li>
        <li>
          {m.terms_no_illegal_use()}
        </li>
        <li>
          {m.terms_as_is_notice()}
        </li>
      </ul>
      <h3 class={styles.heading}>
        {m.intellectual_property()}
      </h3>
      <ul class={styles.list}>
        <li>
          {m.terms_license_notice()}
        </li>
        <li>
          {m.terms_btu_materials_notice()}
        </li>
      </ul>
      <h3 class={styles.heading}>
        {m.disclaimers_and_limitation_of_liability()}
      </h3>
      <p class={styles.uppercaseNote}>
        {m.terms_as_is_disclaimer()}
      </p>
      <p>
        {m.terms_no_affiliation()}
      </p>
      <h3 class={styles.heading}>
        {m.governing_law()}
      </h3>
      <p>
        {m.terms_governing_law()}
      </p>
      <h3 class={styles.heading}>
        {m.changes_to_terms()}
      </h3>
      <p>
        {m.terms_changes_body()}
      </p>
      <h3 class={styles.heading}>
        {m.contact()}
      </h3>
      <p>
        {renderRichText(m.support_issue_link(), [
          <a
            key="terms-issue"
            href="https://github.com/USLTD/btu-timetable"
            class={styles.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="github.com/USLTD/btu-timetable"
          >
            github.com/USLTD/btu-timetable
          </a>,
        ])}
      </p>
      <p class={styles.footerNote}>
        {m.terms_footer_note()}
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
  uppercaseNote: "uppercase text-xs",
  footerNote: "italic text-xs text-gray-500 dark:text-gray-400",
};
