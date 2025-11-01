import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  completeAthleteRegistration,
  uploadAthleteDocument,
} from "../api/athletes";
import { useTranslation } from "../i18n/useTranslation";
import type {
  Athlete,
  AthleteDocumentMetadata,
  AthleteRegistrationCompletionPayload,
} from "../types/athlete";

const todayIso = () => new Date().toISOString().slice(0, 10);

interface NewAthleteStepTwoFormProps {
  athlete: Athlete;
  onSuccess?: () => void;
  onClose?: () => void;
}

const NewAthleteStepTwoForm = ({ athlete, onSuccess, onClose }: NewAthleteStepTwoFormProps) => {
  const queryClient = useQueryClient();
  const t = useTranslation();

  const [form, setForm] = useState({
    email: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    province: "",
    postal_code: "",
    country: "",
    guardian_name: "",
    guardian_relationship: "",
    guardian_email: "",
    guardian_phone: "",
    secondary_guardian_name: "",
    secondary_guardian_relationship: "",
    secondary_guardian_email: "",
    secondary_guardian_phone: "",
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_phone: "",
    medical_allergies: "",
    medical_conditions: "",
    physician_name: "",
    physician_phone: "",
  });

  const [showSecondaryGuardian, setShowSecondaryGuardian] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: AthleteRegistrationCompletionPayload) =>
      completeAthleteRegistration(athlete.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete", athlete.id] });
      queryClient.invalidateQueries({ queryKey: ["athlete-report", athlete.id] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      setStatusMessage("Cadastro completado com sucesso!");
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      email: prev.email || athlete.email || "",
      phone: prev.phone || athlete.phone || "",
    }));
  }, [athlete]);

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: AthleteRegistrationCompletionPayload = {
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address_line1: form.address_line1.trim() || undefined,
      address_line2: form.address_line2.trim() || undefined,
      city: form.city.trim() || undefined,
      province: form.province.trim() || undefined,
      postal_code: form.postal_code.trim() || undefined,
      country: form.country.trim() || undefined,
      guardian_name: form.guardian_name.trim() || undefined,
      guardian_relationship: form.guardian_relationship.trim() || undefined,
      guardian_email: form.guardian_email.trim() || undefined,
      guardian_phone: form.guardian_phone.trim() || undefined,
      secondary_guardian_name: showSecondaryGuardian
        ? form.secondary_guardian_name.trim() || undefined
        : undefined,
      secondary_guardian_relationship: showSecondaryGuardian
        ? form.secondary_guardian_relationship.trim() || undefined
        : undefined,
      secondary_guardian_email: showSecondaryGuardian
        ? form.secondary_guardian_email.trim() || undefined
        : undefined,
      secondary_guardian_phone: showSecondaryGuardian
        ? form.secondary_guardian_phone.trim() || undefined
        : undefined,
      emergency_contact_name: form.emergency_contact_name.trim() || undefined,
      emergency_contact_relationship: form.emergency_contact_relationship.trim() || undefined,
      emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
      medical_allergies: form.medical_allergies.trim() || undefined,
      medical_conditions: form.medical_conditions.trim() || undefined,
      physician_name: form.physician_name.trim() || undefined,
      physician_phone: form.physician_phone.trim() || undefined,
    };

    mutation.mutate(payload);
  };

  const athleteName = `${athlete.first_name} ${athlete.last_name}`.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto">
      <header className="space-y-1 border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Completar Cadastro de Atleta
        </h2>
        <p className="text-sm text-gray-600">
          Informações adicionais para {athleteName} (todos os campos são opcionais)
        </p>
      </header>

      {statusMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {statusMessage}
        </div>
      )}

      {/* Informações de Contato */}
      <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
        <h3 className="text-sm font-semibold text-gray-900">
          Informações de Contato
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Telefone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Endereço */}
      <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
        <h3 className="text-sm font-semibold text-gray-900">
          Endereço
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700">
              Endereço (Rua/Avenida)
            </label>
            <input
              type="text"
              id="address_line1"
              name="address_line1"
              value={form.address_line1}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700">
              Complemento (Número, Apartamento, etc.)
            </label>
            <input
              type="text"
              id="address_line2"
              name="address_line2"
              value={form.address_line2}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                Cidade
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={form.city}
                onChange={handleFieldChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="province" className="block text-sm font-medium text-gray-700">
                Estado/Província
              </label>
              <input
                type="text"
                id="province"
                name="province"
                value={form.province}
                onChange={handleFieldChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                CEP
              </label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={form.postal_code}
                onChange={handleFieldChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                País
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={form.country}
                onChange={handleFieldChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Responsável/Guardião */}
      <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Responsável/Guardião
          </h3>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={showSecondaryGuardian}
              onChange={(event) => setShowSecondaryGuardian(event.target.checked)}
              className="h-3 w-3 text-blue-600 focus:ring-blue-500"
            />
            Adicionar segundo responsável
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="guardian_name" className="block text-sm font-medium text-gray-700">
              Nome do Responsável
            </label>
            <input
              type="text"
              id="guardian_name"
              name="guardian_name"
              value={form.guardian_name}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="guardian_relationship" className="block text-sm font-medium text-gray-700">
              Parentesco
            </label>
            <input
              type="text"
              id="guardian_relationship"
              name="guardian_relationship"
              value={form.guardian_relationship}
              onChange={handleFieldChange}
              placeholder="Ex: Pai, Mãe, Tutor"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="guardian_email" className="block text-sm font-medium text-gray-700">
              Email do Responsável
            </label>
            <input
              type="email"
              id="guardian_email"
              name="guardian_email"
              value={form.guardian_email}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="guardian_phone" className="block text-sm font-medium text-gray-700">
              Telefone do Responsável
            </label>
            <input
              type="tel"
              id="guardian_phone"
              name="guardian_phone"
              value={form.guardian_phone}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {showSecondaryGuardian && (
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-gray-200">
            <div>
              <label htmlFor="secondary_guardian_name" className="block text-sm font-medium text-gray-700">
                Nome do Segundo Responsável
              </label>
              <input
                type="text"
                id="secondary_guardian_name"
                name="secondary_guardian_name"
                value={form.secondary_guardian_name}
                onChange={handleFieldChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="secondary_guardian_relationship" className="block text-sm font-medium text-gray-700">
                Parentesco
              </label>
              <input
                type="text"
                id="secondary_guardian_relationship"
                name="secondary_guardian_relationship"
                value={form.secondary_guardian_relationship}
                onChange={handleFieldChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="secondary_guardian_email" className="block text-sm font-medium text-gray-700">
                Email do Segundo Responsável
              </label>
              <input
                type="email"
                id="secondary_guardian_email"
                name="secondary_guardian_email"
                value={form.secondary_guardian_email}
                onChange={handleFieldChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="secondary_guardian_phone" className="block text-sm font-medium text-gray-700">
                Telefone do Segundo Responsável
              </label>
              <input
                type="tel"
                id="secondary_guardian_phone"
                name="secondary_guardian_phone"
                value={form.secondary_guardian_phone}
                onChange={handleFieldChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </section>

      {/* Contato de Emergência */}
      <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
        <h3 className="text-sm font-semibold text-gray-900">
          Contato de Emergência
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700">
              Nome
            </label>
            <input
              type="text"
              id="emergency_contact_name"
              name="emergency_contact_name"
              value={form.emergency_contact_name}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="emergency_contact_relationship" className="block text-sm font-medium text-gray-700">
              Parentesco
            </label>
            <input
              type="text"
              id="emergency_contact_relationship"
              name="emergency_contact_relationship"
              value={form.emergency_contact_relationship}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700">
              Telefone
            </label>
            <input
              type="tel"
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              value={form.emergency_contact_phone}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Informações Médicas */}
      <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
        <h3 className="text-sm font-semibold text-gray-900">
          Informações Médicas
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="medical_allergies" className="block text-sm font-medium text-gray-700">
              Alergias
            </label>
            <textarea
              id="medical_allergies"
              name="medical_allergies"
              rows={3}
              value={form.medical_allergies}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Descreva qualquer alergia conhecida..."
            />
          </div>
          <div>
            <label htmlFor="medical_conditions" className="block text-sm font-medium text-gray-700">
              Condições Médicas
            </label>
            <textarea
              id="medical_conditions"
              name="medical_conditions"
              rows={3}
              value={form.medical_conditions}
              onChange={handleFieldChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Descreva qualquer condição médica relevante..."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="physician_name" className="block text-sm font-medium text-gray-700">
                Nome do Médico
              </label>
              <input
                type="text"
                id="physician_name"
                name="physician_name"
                value={form.physician_name}
                onChange={handleFieldChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="physician_phone" className="block text-sm font-medium text-gray-700">
                Telefone do Médico
              </label>
              <input
                type="tel"
                id="physician_phone"
                name="physician_phone"
                value={form.physician_phone}
                onChange={handleFieldChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </section>

      {mutation.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Erro ao salvar informações. Tente novamente.
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Pular e Finalizar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? "Salvando..." : "Completar Cadastro"}
        </button>
      </div>
    </form>
  );
};

export default NewAthleteStepTwoForm;
