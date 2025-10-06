import { Link } from "react-router-dom";

import { useAthletes } from "../hooks/useAthletes";

const Athletes = () => {
  const { data, isLoading, isError } = useAthletes();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Atletas</h1>
          <p className="text-sm text-slate-500">
            Registre participantes e acompanhe o desempenho de cada teste realizado.
          </p>
        </div>
        <Link
          to="/athletes/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          Adicionar atleta
        </Link>
      </header>

      <section className="rounded-xl bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Clube
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                E-mail
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  Carregando atletas...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-red-500">
                  Não foi possível carregar os atletas.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  Nenhum atleta cadastrado ainda.
                </td>
              </tr>
            )}
            {data?.map((athlete) => (
              <tr key={athlete.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 text-sm font-medium text-slate-900">
                  {athlete.first_name} {athlete.last_name}
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">
                  {athlete.club_affiliation ?? "-"}
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">{athlete.email ?? "-"}</td>
                <td className="px-4 py-4 text-right text-sm">
                  <Link
                    to={`/athletes/${athlete.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Athletes;
