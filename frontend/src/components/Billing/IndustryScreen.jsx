import { useAuth } from "../../contexts/AuthContext";
import { resolveIndustryProfile } from "../../config/industryProfiles";
import { INDUSTRY_SCREENS } from "../../config/industryScreens";

// Generic replacement for the 8 Industry*Router.jsx files — each one just
// resolved the current profile and switched on `key` (or `billingModel`) to
// pick a component. See config/industryScreens.js for the registry and
// UNIFICATION_PLAN.md Phase 7 for the history.
export default function IndustryScreen({ kind }) {
  const { currentUser } = useAuth();
  const profile = resolveIndustryProfile(currentUser);
  const screen = INDUSTRY_SCREENS[kind];

  if (!screen) {
    console.error(`IndustryScreen: unknown kind "${kind}"`);
    return null;
  }

  const Component =
    screen.byModel?.[profile.billingModel] ||
    screen.byKey?.[profile.key] ||
    screen.default;

  return <Component />;
}
