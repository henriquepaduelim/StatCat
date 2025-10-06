import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import api from "../api/client";
import type { Athlete, AthletePayload } from "../types/athlete";

type FormState = Omit<AthletePayload, "height_cm" | "weight_kg"> & {
  height_cm?: string;
  weight_kg?: string;
};

const initialState: FormState = {
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
  const [formData, setFormData] = useState<FormState>(initialState);

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

  const handleChange = (
    event: FormEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.currentTarget;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toPayload = (): AthletePayload => ({
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
    await mutation.mutateAsync(toPayload());
  };

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Cadastrar atleta</h1>
        <p className="text-sm text-slate-500">
          Adicione participantes ao evento e associe suas medições aos testes personalizados.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-600">
            Nome
            <input
              required
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Sobrenome
            <input
              required
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-600">
            E-mail
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Clube/Instituição
            <input
              type="text"
              name="club_affiliation"
              value={formData.club_affiliation}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-600">
            Data de nascimento
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Altura (cm)
            <input
              type="number"
              step="0.1"
              name="height_cm"
              value={formData.height_cm}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Peso (kg)
            <input
              type="number"
              step="0.1"
              name="weight_kg"
              value={formData.weight_kg}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        <label className="text-sm font-medium text-slate-600">
          Pé dominante
          <select
            name="dominant_foot"
            value={formData.dominant_foot}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Selecione</option>
            <option value="direito">Direito</option>
            <option value="esquerdo">Esquerdo</option>
            <option value="ambidestro">Ambidestro</option>
          </select>
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Salvando..." : "Salvar atleta"}
        </button>
      </form>
    </div>
  );
};

export default NewAthlete;
