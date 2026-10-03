# Production rollout — Aktywnik+

## Cel

Po każdym wydaniu produkcyjnym należy potwierdzić, że publiczny Vercel rzeczywiście odpowiada bieżącemu `main`, a nie starszemu deploymentowi.

## Aktualny target

- URL: `https://aktywnik-plus.vercel.app`
- oczekiwana wersja: `0.5.0-beta.3`
- backend stage: `full-family-sync-pilot`

## Minimalna weryfikacja po deployu

1. `/` → HTTP 200, CSP i HSTS;
2. `/api/health` → `version=0.5.0-beta.3`, `backend=full-family-sync-pilot`;
3. `/api/capabilities` → RLS/security capabilities obecne;
4. dla pilota chmurowego:
   - `cloud.enabled=true`;
   - `databaseConfigured=true`;
   - `authenticationConfigured=true`;
   - `rowLevelSecurityVerified=true`;
   - `familySync=true`;
   - `familySyncDeletes=true`;
   - `familySyncDecisionHistory=true`;
   - `familyCloudOnboarding=true`.

## Automatyczny smoke

Ręcznie uruchom workflow **Production smoke** w GitHub Actions po udanym deployu Vercel.

Lokalnie:

```bash
AKTYWNIK_EXPECTED_VERSION=0.5.0-beta.3 \
AKTYWNIK_REQUIRE_CLOUD=true \
node tests/production-smoke.mjs
```

## Gdy Vercel zgłasza build-rate-limit

To blocker platformowy, nie błąd aplikacji. Nie generować kolejnych pustych commitów. Po zwolnieniu limitu należy wykonać jeden redeploy bieżącego `main`, a następnie uruchomić Production smoke.

## Kryterium zamknięcia blockera

Blocker można oznaczyć jako zamknięty dopiero, gdy:
- Vercel deployment dla bieżącego `main` ma status READY;
- `/api/health` raportuje bieżącą wersję;
- Production smoke przechodzi z `require_cloud=true`;
- po deployu nie występują błędy runtime w podstawowych endpointach.
