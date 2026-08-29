// GERADO por scripts/gerar-dados.mjs — não editar à mão.
// Origem: linha da tabela `mapas`, id 1aefb84b-7f37-4628-a960-e65095535a6e.

export const DOC = { largura: 1280, altura: 720 } as const;

/** Enquadramento salvo: é o que amarra os tiles ao desenho. */
export const ENQUADRAMENTO = {
  lat: -29.8341,
  lng: -51.172118,
  zoom: 19,
  rotacao: 59,
  escalaBase: 1.0017611997265548,
} as const;

export const VEU = 0.18;

export const GRADE = {
  "cor": "#f2b705",
  "letras": true,
  "ligada": true,
  "linhas": 10,
  "colunas": 10,
  "numeros": true,
  "rotulos": true,
  "espessura": 1.5,
  "opacidade": 0.55
} as const;

export interface AreaMapa {
  pontos: [number, number][];
  traco: string;
  preenchimento: string;
  espessura: number;
  tracejado: number[] | null;
}

export const AREAS: AreaMapa[] = [
  {
    "pontos": [
      [
        402.9,
        593.9
      ],
      [
        293.5,
        596.2
      ],
      [
        262.9,
        618.6
      ],
      [
        272.4,
        649.2
      ],
      [
        235.9,
        650.3
      ],
      [
        228.8,
        565.6
      ],
      [
        235.9,
        528
      ],
      [
        371.2,
        526.8
      ],
      [
        413.5,
        526.8
      ],
      [
        404.1,
        592.7
      ],
      [
        404.1,
        593.9
      ]
    ],
    "traco": "#f2b705",
    "preenchimento": "#f2b70538",
    "espessura": 3,
    "tracejado": [
      12,
      8
    ]
  },
  {
    "pontos": [
      [
        401.8,
        432.7
      ],
      [
        460.6,
        432.7
      ],
      [
        459.4,
        517.4
      ],
      [
        406.5,
        518.6
      ],
      [
        400.6,
        432.7
      ],
      [
        400.6,
        432.7
      ]
    ],
    "traco": "#f2b705",
    "preenchimento": "#f2b70538",
    "espessura": 3,
    "tracejado": [
      12,
      8
    ]
  },
  {
    "pontos": [
      [
        742.9,
        505.6
      ],
      [
        761.8,
        491.5
      ],
      [
        785.3,
        493.9
      ],
      [
        793.5,
        473.9
      ],
      [
        817.1,
        475
      ],
      [
        917.1,
        473.9
      ],
      [
        921.8,
        586.8
      ],
      [
        915.9,
        652.7
      ],
      [
        777.1,
        655
      ],
      [
        764.1,
        638.6
      ],
      [
        777.1,
        539.7
      ],
      [
        747.6,
        542.1
      ],
      [
        742.9,
        511.5
      ],
      [
        740.6,
        503.3
      ],
      [
        740.6,
        503.3
      ]
    ],
    "traco": "#ef4444",
    "preenchimento": "#ef444438",
    "espessura": 3,
    "tracejado": [
      12,
      8
    ]
  },
  {
    "pontos": [
      [
        458.4,
        522
      ],
      [
        442.9,
        717.6
      ],
      [
        410.6,
        719.5
      ],
      [
        408.7,
        569.8
      ],
      [
        416.4,
        524.6
      ],
      [
        457.7,
        520.7
      ],
      [
        457.7,
        520.7
      ]
    ],
    "traco": "#3b82f6",
    "preenchimento": "#3b82f638",
    "espessura": 3,
    "tracejado": [
      12,
      8
    ]
  }
];

export interface SimboloMapa {
  x: number;
  y: number;
  escala: number;
  cor: string;
  rotulo: string;
  larguraGrupo: number;
}

export const SIMBOLOS_MAPA: SimboloMapa[] = [
  {
    "x": 320.1,
    "y": 559.5,
    "escala": 0.5259,
    "cor": "#8b8f8a",
    "rotulo": "ESTACIONAMENTO",
    "larguraGrupo": 198.1
  },
  {
    "x": 836.9,
    "y": 553.4,
    "escala": 1,
    "cor": "#ef4444",
    "rotulo": "CQB",
    "larguraGrupo": 80.3
  },
  {
    "x": 428.5,
    "y": 607.4,
    "escala": 0.646,
    "cor": "#3b82f6",
    "rotulo": "SAFE ZONE",
    "larguraGrupo": 139
  },
  {
    "x": 667.3,
    "y": 388.5,
    "escala": 1,
    "cor": "#a855f7",
    "rotulo": "TORRE",
    "larguraGrupo": 101.5
  },
  {
    "x": 561.9,
    "y": 579.5,
    "escala": 1,
    "cor": "#a16207",
    "rotulo": "TRINCHEIRA",
    "larguraGrupo": 147.8
  }
];
