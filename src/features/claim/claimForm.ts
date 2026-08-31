import type { CreatorClaim, CreatorContactPreference } from "../../types";

export type ClaimFormState = {
  displayName: string;
  biography: string;
  categories: string;
  languages: string;
  country: string;
  city: string;
  postalCode: string;
  websiteUrl: string;
  businessEmail: string;
  whatsapp: string;
  managementType: "self_managed" | "talent_managed";
  managerName: string;
  managerEmail: string;
  managerWhatsapp: string;
  contactPreference: CreatorContactPreference;
};

export function claimFormFromClaim(claim: CreatorClaim): ClaimFormState {
  return {
    displayName: claim.displayName ?? "",
    biography: claim.biography ?? "",
    categories: claim.categories.join(", "),
    languages: claim.languages.join(", "),
    country: claim.country ?? "",
    city: claim.city ?? "",
    postalCode: claim.postalCode ?? "",
    websiteUrl: claim.websiteUrl ?? "",
    businessEmail: claim.businessEmail ?? "",
    whatsapp: claim.whatsapp ?? "",
    managementType: claim.managementType ?? "self_managed",
    managerName: claim.managerName ?? "",
    managerEmail: claim.managerEmail ?? "",
    managerWhatsapp: claim.managerWhatsapp ?? "",
    contactPreference: claim.contactPreference,
  };
}

export function mergeUntouchedClaimForm(
  current: ClaimFormState,
  claim: CreatorClaim,
  touchedFields: ReadonlySet<keyof ClaimFormState>,
) {
  const incoming = claimFormFromClaim(claim);
  const next = { ...current };
  for (const key of Object.keys(incoming) as Array<keyof ClaimFormState>) {
    if (!touchedFields.has(key)) Object.assign(next, { [key]: incoming[key] });
  }
  return next;
}
