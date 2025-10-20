export type ID = string;

export const toDisplayName = (name: string): string => {
  const map: Record<string, string> = {
    Arabic: 'اللغة العربية',
    Islamic: 'الدراسات الإسلامية',
    'Social Arabic': 'الدراسات الاجتماعية',
    'الدراسات الاجتماعية باللغة العربية': 'الدراسات الاجتماعية',
  };
  return map[name] || name;
};

export const isArabicBlock = (name: string): boolean => {
  const map: Record<string, string> = {
    Arabic: 'اللغة العربية',
    Islamic: 'الدراسات الإسلامية',
    'Social Arabic': 'الدراسات الاجتماعية',
    'الدراسات الاجتماعية باللغة العربية': 'الدراسات الاجتماعية',
  };
  const label = map[name] || name;
  return (
    label === 'اللغة العربية' ||
    label === 'الدراسات الإسلامية' ||
    label === 'الدراسات الاجتماعية'
  );
};
