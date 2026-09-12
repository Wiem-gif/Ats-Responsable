import Link from "next/link";

export default function LimitesIAPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="mb-6 inline-block text-xs text-slate-400 hover:text-slate-600">
        ← Retour aux postes
      </Link>

      <h1 className="mb-6 text-xl font-semibold tracking-tight">
        Rôle et limites de l&apos;IA dans cet outil
      </h1>

      <div className="space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="mb-1 font-medium text-slate-900">Ce que l&apos;IA fait</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Extrait des informations factuelles d&apos;un CV (expérience, compétences, formation).</li>
            <li>
              Constate la présence ou l&apos;absence d&apos;un critère du poste dans le CV — jamais un
              jugement de qualité.
            </li>
            <li>Suggère des questions d&apos;entretien pour clarifier les points ambigus.</li>
            <li>Propose des brouillons d&apos;email, toujours soumis à validation humaine.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 font-medium text-slate-900">Ce que l&apos;IA ne fait jamais</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Elle n&apos;attribue aucun score global ni pourcentage de correspondance.</li>
            <li>Elle ne rejette et ne présélectionne jamais un candidat automatiquement.</li>
            <li>Elle n&apos;envoie aucun email sans qu&apos;un recruteur l&apos;ait explicitement validé.</li>
            <li>Elle n&apos;invente jamais d&apos;information absente du CV.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 font-medium text-slate-900">Traçabilité</h2>
          <p>
            Chaque information extraite est reliée à une citation exacte du CV source. Un recruteur peut
            corriger toute extraction erronée à tout moment ; la correction est enregistrée et prend le
            pas sur la valeur générée par l&apos;IA.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-medium text-slate-900">Données et confidentialité</h2>
          <p>
            Les CV sont stockés de façon privée, accessibles uniquement via des liens temporaires
            signés. Un candidat peut demander la suppression de ses données à tout moment, y compris en
            cours de processus de recrutement.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-medium text-slate-900">Limites connues</h2>
          <p>
            Les CV scannés en image de mauvaise qualité peuvent échouer à l&apos;extraction automatique,
            même après OCR — une saisie manuelle est alors proposée. Les modèles de langage utilisés,
            bien que soumis à des consignes strictes de neutralité et de factualité, peuvent
            occasionnellement mal interpréter une formulation ambiguë du CV — d&apos;où l&apos;importance de la
            correction humaine.
          </p>
        </section>
      </div>
    </main>
  );
}