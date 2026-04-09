import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">ML Studio</h1>
        <p className="text-xl text-gray-600 mb-8">
          Entraînez des modèles de Machine Learning sans écrire une seule ligne de code.
          Uploadez vos données, configurez votre pipeline, et comparez les résultats.
        </p>
        <Link href="/studio" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors">
          Commencer →
        </Link>
      </div>
    </div>
  );
}
