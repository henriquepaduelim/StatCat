import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import api from "../api/client";
import type { Athlete, AthletePayload } from "../types/athlete";
import { useThemeStore } from "../theme/useThemeStore";

type FormState = {
  client_id: string;
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  dominant_foot: string;
  club_affiliation: string;
  height_cm: string;
  weight_kg: string;
};

const INITIAL_STATE: FormState = {
  client_id: "",
  first_name: "",
  last_name: "",
  email: "",
  birth_date: "",
  dominant_foot: "",
  club_affiliation: "",
  height_cm: "",
  weight_kg: "",
};

const NewAthlete = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, themes } = useThemeStore((state) => ({
    theme: state.theme,
    themes: state.themes,
  }));

  const [formData, setFormData] = useState<FormState>(() => ({
    ...INITIAL_STATE,
    client_id: theme.clientId ? String(theme.clientId) : "",
  }));

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      client_id: prev.client_id || (theme.clientId ? String(theme.clientId) : ""),
    }));
  }, [theme.clientId]);

  const mutation = useMutation({
    mutationFn: async (payload: AthletePayload) => {
      const { data } = await api.post<Athlete>("/athletes", payload);
      return data;
    },
    onSuccess: (athlete) => {
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      navigate(`/athletes/${athlete.id}`);
    },
  });

  const errorMessage =
    mutation.isError && mutation.error instanceof Error
      ? mutation.error.message
      : mutation.isError
        ? "Não foi possível salvar o atleta."
        : null;

  const handleChange = (
    event: FormEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.currentTarget;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const selectedClient = useMemo(
    () => themes.find((item) => item.clientId && String(item.clientId) === formData.client_id),
    [themes, formData.client_id]
  );

  const toPayload = (): AthletePayload => ({
    client_id: formData.client_id ? Number(formData.client_id) : theme.clientId,
    first_name: formData.first_name,
    last_name: formData.last_name,
    email: formData.email?.trim() || undefined,
    birth_date: formData.birth_date || undefined,
    dominant_foot: formData.dominant_foot || undefined,
    club_affiliation: formData.club_affiliation?.trim() || undefined,
    height_cm: formData.height_cm ? Number(formData.height_cm) : undefined,
    weight_kg: formData.weight_kg ? Number(formData.weight_kg) : undefined,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync(toPayload());
    } catch (error) {
      console.error("Falha ao salvar atleta", error);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-on-surface">Cadastrar atleta</h1>
        <p className="text-sm text-muted">
          Adicione participantes ao evento e associe suas medições aos testes personalizados.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl bg-surface p-6 shadow-sm"
      >
        <label className="text-sm font-medium text-muted">
          Cliente / Clube
          <select
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Selecione o cliente</option>
            {themes
              .filter((item) => item.clientId)
              .map((item) => (
                <option key={item.id} value={item.clientId}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-muted">
            Nome
            <input
              required
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Sobrenome
            <input
              required
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-muted">
            E-mail
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Clube/Instituição
            <input
              type="text"
              name="club_affiliation"
              value={formData.club_affiliation}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-muted">
            Data de nascimento
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Altura (cm)
            <input
              type="number"
              step="0.1"
              name="height_cm"
              value={formData.height_cm}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Peso (kg)
            <input
              type="number"
              step="0.1"
              name="weight_kg"
              value={formData.weight_kg}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        <label className="text-sm font-medium text-muted">
          Pé dominante
          <select
            name="dominant_foot"
            value={formData.dominant_foot}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Selecione</option>
            <option value="direito">Direito</option>
            <option value="esquerdo">Esquerdo</option>
            <option value="ambidestro">Ambidestro</option>
          </select>
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition disabled:opacity-60"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Salvando..." : "Salvar atleta"}
        </button>
        {selectedClient && (
          <p className="text-xs text-muted">
            Layout aplicado: <span className="font-semibold">{selectedClient.name}</span>
          </p>
        )}
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      </form>
    </div>
  );
};

export default NewAthlete;
