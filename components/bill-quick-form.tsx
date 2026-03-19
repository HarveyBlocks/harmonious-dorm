import { LIMITS } from '@/lib/limits';

interface BillFormTexts {
  quickBill: string;
  customCategory: string;
  billAmount: string;
  publish: string;
}

interface QuickBillFormProps {
  texts: BillFormTexts;
  categories: Array<{ value: string; label: string }>;
  billDescription: string;
  billTotal: string;
  billCategory: string;
  billUseWeights: boolean;
  splitEqualLabel: string;
  splitWeightLabel: string;
  members: Array<{ id: number; name: string }>;
  participants: number[];
  participantWeights: Record<number, string>;
  previewAmounts: Map<number, number>;
  errorText?: string | null;
  onBillDescriptionChange: (value: string) => void;
  onBillTotalChange: (value: string) => void;
  onBillCategoryChange: (value: string) => void;
  onSplitModeChange: (useWeights: boolean) => void;
  onToggleParticipant: (memberId: number, checked: boolean) => void;
  onParticipantWeightChange: (memberId: number, value: string) => void;
  onSubmit: () => void;
}

export function QuickBillForm(props: QuickBillFormProps) {
  const {
    texts,
    categories,
    billDescription,
    billTotal,
    billCategory,
    billUseWeights,
    splitEqualLabel,
    splitWeightLabel,
    members,
    participants,
    participantWeights,
    previewAmounts,
    errorText,
    onBillDescriptionChange,
    onBillTotalChange,
    onBillCategoryChange,
    onSplitModeChange,
    onToggleParticipant,
    onParticipantWeightChange,
    onSubmit,
  } = props;

  return (
    <div className="glass-card sleep-depth-mid p-8 rounded-2xl h-fit">
      <h3 className="text-xl font-black mb-6">{texts.quickBill}</h3>
      <div className="space-y-4">

        <input
          type="number"
          value={billTotal}
          onChange={(e) => onBillTotalChange(e.target.value)}
          className="w-full p-4 rounded-2xl glass-card custom-field outline-none focus:accent-border font-bold"
          placeholder={`${texts.billAmount} ¥`}
        />

        <select
          value={billCategory}
          onChange={(e) => onBillCategoryChange(e.target.value)}
          className="w-full p-4 rounded-2xl glass-card custom-field outline-none"
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>

        {billCategory === '__custom__' ? (
          <input
            type="text"
            value={billDescription}
            onChange={(e) => onBillDescriptionChange(e.target.value)}
            className="w-full p-4 rounded-2xl glass-card custom-field outline-none focus:accent-border font-bold"
            placeholder={texts.customCategory}
          />
        ) : null}

        <select
          value={billUseWeights ? 'weight' : 'equal'}
          onChange={(e) => onSplitModeChange(e.target.value === 'weight')}
          className="w-full p-4 rounded-2xl glass-card custom-field outline-none"
        >
          <option value="equal">{splitEqualLabel}</option>
          <option value="weight">{splitWeightLabel}</option>
        </select>

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {members.map((member) => {
            const checked = participants.includes(member.id);
            const preview = previewAmounts.get(member.id) || 0;
            return (
              <label key={member.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 text-sm px-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onToggleParticipant(member.id, e.target.checked)}
                />
                <span>{member.name}</span>

                {checked ? (
                  <span className="text-xs font-bold text-muted whitespace-nowrap">
                    ¥{preview.toFixed(2)}
                  </span>
                ) : (
                  <span />
                )}

                {billUseWeights && checked ? (
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max={LIMITS.BILL_WEIGHT}
                    value={participantWeights[member.id] == null || participantWeights[member.id] === '' ? '1' : participantWeights[member.id]}
                    onChange={(e) => onParticipantWeightChange(member.id, e.target.value)}
                    className="w-16 h-8 px-2 rounded-lg custom-field compact-number-field outline-none text-right text-xs font-semibold"
                  />
                ) : (
                  <span />
                )}
              </label>
            );
          })}
        </div>

        <button
          onClick={onSubmit}
          className="w-full py-4 accent-bg rounded-2xl font-black shadow-xl hover:translate-y-[-2px] transition-all"
        >
          {texts.publish}
        </button>

        {errorText ? <p className="text-rose-500 text-sm">{errorText}</p> : null}
      </div>
    </div>
  );
}






