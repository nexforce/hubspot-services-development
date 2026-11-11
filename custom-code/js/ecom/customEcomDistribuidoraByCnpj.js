const dotenv = require("dotenv");

// Uses the .env file to get the accessToken (Important: never commit the accessToken to the repository!)
dotenv.config();

// When sending to the custom code workflow, copy from this line to the comment [FINAL]
const distributorsData = {
  "02341467000120": {
    distributorName: "AMAZONAS",
    concessionaireCode: 2,
    codCce: "2562",
    thundersId: "122",
  },
  86439510000185: {
    distributorName: "ANITA GARIBALDI",
    concessionaireCode: 75,
    codCce: "50024",
    thundersId: "79834609-8ee8-46e7-8cc4-3799bcdfb8e2",
  },
  30460297000139: {
    distributorName: "CASTRO",
    concessionaireCode: 103,
    codCce: "",
    thundersId: "8a5728ee-48b8-4b48-9368-a6402b6b176a",
  },
  "05965546000109": {
    distributorName: "CEA",
    concessionaireCode: 7,
    codCce: "4092",
    thundersId: "125",
  },
  "07522669000192": {
    distributorName: "CEB",
    concessionaireCode: 9,
    codCce: "1571",
    thundersId: "108",
  },
  60196987000193: {
    distributorName: "CEDRAP",
    concessionaireCode: 89,
    codCce: "50120",
    thundersId: "dffa3b02-fdc1-4dc8-a9e5-b85bbe9b802b",
  },
  "08467115000100": {
    distributorName: "CEEE",
    concessionaireCode: 10,
    codCce: "1970",
    thundersId: "119",
  },
  86444163000189: {
    distributorName: "CEGERO",
    concessionaireCode: 104,
    codCce: "14676",
    thundersId: "fc6a7923-d60b-409a-9d55-ec4c5b5f08e8",
  },
  "08336783000190": {
    distributorName: "CELESC",
    concessionaireCode: 11,
    codCce: "1936",
    thundersId: "",
  },
  87776043000141: {
    distributorName: "CELETRO",
    concessionaireCode: 105,
    codCce: "",
    thundersId: "fad27e4d-863e-404e-b2fd-faca6212e4b0",
  },
  10835932000108: {
    distributorName: "CELPE",
    concessionaireCode: 14,
    codCce: "17",
    thundersId: "82",
  },
  "06981180000116": {
    distributorName: "CEMIG",
    concessionaireCode: 18,
    codCce: "1141",
    thundersId: "73",
  },
  "06981176000158": {
    distributorName: "CEMIG",
    concessionaireCode: 18,
    codCce: "1140",
    thundersId: "",
  },
  45955360000185: {
    distributorName: "CEMIG SIM",
    concessionaireCode: null,
    codCce: "",
    thundersId: "",
  },
  52777034000190: {
    distributorName: "CEMIRIM",
    concessionaireCode: 106,
    codCce: "76221",
    thundersId: "921cc6bc-5c10-4650-bdc6-20353cb2c003",
  },
  78274610000170: {
    distributorName: "CEPRAG",
    concessionaireCode: 90,
    codCce: "49905",
    thundersId: "9a582bee-b3c1-432e-bc6d-9a427957bc7c",
  },
  "09364804000144": {
    distributorName: "CERACA",
    concessionaireCode: 68,
    codCce: "",
    thundersId: "6db35d31-8b50-40db-9306-dcb3c01ad207",
  },
  28610236000169: {
    distributorName: "CERAL",
    concessionaireCode: 107,
    codCce: "70372",
    thundersId: "",
  },
  10532365000110: {
    distributorName: "CERAL",
    concessionaireCode: 77,
    codCce: "49998",
    thundersId: "",
  },
  86433042000131: {
    distributorName: "CERBRANORTE",
    concessionaireCode: 67,
    codCce: "3007",
    thundersId: "3216c510-1101-42a8-97fe-ccbae1561cbf",
  },
  76879295000180: {
    distributorName: "CERCAR",
    concessionaireCode: null,
    codCce: "16175",
    thundersId: "",
  },
  27707397000102: {
    distributorName: "CERCI",
    concessionaireCode: 108,
    codCce: "",
    thundersId: "",
  },
  31465487000101: {
    distributorName: "CERES",
    concessionaireCode: 80,
    codCce: "",
    thundersId: "",
  },
  97505838000179: {
    distributorName: "CERFOX",
    concessionaireCode: 109,
    codCce: "69433",
    thundersId: "8dbe0466-2f87-45a6-bed2-f433ea9445d0",
  },
  "01229747000189": {
    distributorName: "CERGAPA",
    concessionaireCode: 91,
    codCce: "70370",
    thundersId: "135",
  },
  86449170000173: {
    distributorName: "CERGRAL",
    concessionaireCode: 70,
    codCce: "49786",
    thundersId: "0ae4f181-934b-4bfb-8ca2-05d1e9db698c",
  },
  "03747565000125": {
    distributorName: "CERGRAND",
    concessionaireCode: null,
    codCce: "85030",
    thundersId: "",
  },
  87656989000174: {
    distributorName: "CERILUZ",
    concessionaireCode: 92,
    codCce: "149",
    thundersId: "9933d43d-7c57-42ad-8f20-49bbf7bffe03",
  },
  50235449000107: {
    distributorName: "CERIM",
    concessionaireCode: 87,
    codCce: "70369",
    thundersId: "234a4dc7-b848-4e1e-8699-a61cc2bf2135",
  },
  49606312000132: {
    distributorName: "CERIPA",
    concessionaireCode: 86,
    codCce: "4115",
    thundersId: "3a03428d-41c7-401d-8799-b329bb8c4a43",
  },
  86533346000170: {
    distributorName: "CERMOFUL",
    concessionaireCode: 94,
    codCce: "70358",
    thundersId: "132",
  },
  53176038000186: {
    distributorName: "CERNHE",
    concessionaireCode: 79,
    codCce: "70366",
    thundersId: "",
  },
  76202779000190: {
    distributorName: "CERPA",
    concessionaireCode: null,
    codCce: "",
    thundersId: "",
  },
  85318640000105: {
    distributorName: "CERPALO",
    concessionaireCode: 69,
    codCce: "",
    thundersId: "ef709fb1-ff39-43fc-89de-aafa2266b5c4",
  },
  44560381000139: {
    distributorName: "CERPRO",
    concessionaireCode: 83,
    codCce: "3747",
    thundersId: "",
  },
  46598678000119: {
    distributorName: "CERRP",
    concessionaireCode: 78,
    codCce: "57740",
    thundersId: "",
  },
  11615872000180: {
    distributorName: "CERSAD",
    concessionaireCode: 110,
    codCce: "",
    thundersId: "30eb8e0a-ff95-4ac6-8142-5c0e0cfd2048",
  },
  86512670000102: {
    distributorName: "CERSUL",
    concessionaireCode: 72,
    codCce: "70365",
    thundersId: "60647ab6-772a-426d-8cbf-0ac490fa4c7d",
  },
  97839922000129: {
    distributorName: "CERTAJA",
    concessionaireCode: 76,
    codCce: "4009",
    thundersId: "b5e9fe99-aaae-4d7d-ad0d-addca4e4be64",
  },
  "09257558000121": {
    distributorName: "CERTEL",
    concessionaireCode: 95,
    codCce: "8730",
    thundersId: "283a5df6-9769-455a-9c3d-cb19242dc98b",
  },
  98042963000152: {
    distributorName: "CERTHIL",
    concessionaireCode: 111,
    codCce: "70371",
    thundersId: "4d6d1e47-874d-42e5-8c97-49047551885d",
  },
  76583962000182: {
    distributorName: "CERTREL",
    concessionaireCode: 96,
    codCce: "",
    thundersId: "e9190857-aabe-406a-b49e-4f05d820f42e",
  },
  55188502000180: {
    distributorName: "CERVAM",
    concessionaireCode: 112,
    codCce: "70363",
    thundersId: "136",
  },
  "01377555000110": {
    distributorName: "CHESP",
    concessionaireCode: 23,
    codCce: "9929",
    thundersId: "116",
  },
  75805895000130: {
    distributorName: "COCEL",
    concessionaireCode: 27,
    codCce: "7905",
    thundersId: "90",
  },
  15139629000194: {
    distributorName: "COELBA",
    concessionaireCode: 28,
    codCce: "30",
    thundersId: "78",
  },
  "03487121000106": {
    distributorName: "COESO",
    concessionaireCode: null,
    codCce: "",
    thundersId: "",
  },
  83646653000170: {
    distributorName: "COOPERA",
    concessionaireCode: 73,
    codCce: "",
    thundersId: "133",
  },
  83647990000181: {
    distributorName: "COOPERALIANÇA",
    concessionaireCode: 30,
    codCce: "7322",
    thundersId: "106",
  },
  86532348000145: {
    distributorName: "COOPERCOCAL",
    concessionaireCode: 97,
    codCce: "50876",
    thundersId: "",
  },
  95824322000161: {
    distributorName: "COOPERLUZ",
    concessionaireCode: 24,
    codCce: "2982",
    thundersId: "d2eab7ed-2d79-49ba-bce4-f06e31be817e",
  },
  88022918000182: {
    distributorName: "COOPERNORTE",
    concessionaireCode: 114,
    codCce: "70245",
    thundersId: "dd9c88d8-4843-4844-876d-e59a49d8b072",
  },
  87462750000163: {
    distributorName: "COOPERSUL",
    concessionaireCode: 115,
    codCce: "70244",
    thundersId: "1c92eb76-86ad-431e-bd28-711046e3fd03",
  },
  78829843000192: {
    distributorName: "COOPERZEM",
    concessionaireCode: 116,
    codCce: "11849",
    thundersId: "64b2d102-2d5a-4171-b178-846b68611832",
  },
  86448057000173: {
    distributorName: "COORSEL",
    concessionaireCode: 66,
    codCce: "14095",
    thundersId: "e0e0fcb0-6636-43d7-8115-6f9ec975d899",
  },
  "04368898000106": {
    distributorName: "COPEL",
    concessionaireCode: 31,
    codCce: "81",
    thundersId: "91",
  },
  90660754000160: {
    distributorName: "COPREL",
    concessionaireCode: 99,
    codCce: "3551",
    thundersId: "",
  },
  "08324196000181": {
    distributorName: "COSERN",
    concessionaireCode: 32,
    codCce: "33",
    thundersId: "80",
  },
  33050196000188: {
    distributorName: "CPFL PAULISTA",
    concessionaireCode: 35,
    codCce: "34",
    thundersId: "74",
  },
  "04172213000151": {
    distributorName: "CPFL PIRATININGA",
    concessionaireCode: 36,
    codCce: "94",
    thundersId: "",
  },
  53859112000169: {
    distributorName: "CPFL SANTA CRUZ",
    concessionaireCode: 24,
    codCce: "63",
    thundersId: "65",
  },
  61116265000306: {
    distributorName: "CPFL SANTA CRUZ",
    concessionaireCode: 24,
    codCce: "",
    thundersId: "",
  },
  53859112004407: {
    distributorName: "CPFL SANTA CRUZ",
    concessionaireCode: 24,
    codCce: "",
    thundersId: "",
  },
  53859112004660: {
    distributorName: "CPFL SANTA CRUZ",
    concessionaireCode: 24,
    codCce: "",
    thundersId: "",
  },
  91950261000128: {
    distributorName: "CRELUZ",
    concessionaireCode: 100,
    codCce: "4014",
    thundersId: "b1a71529-f2eb-44c9-a55d-2107f59d05e9",
  },
  89435598000155: {
    distributorName: "CRERAL",
    concessionaireCode: 101,
    codCce: "50000",
    thundersId: "c9e1615c-9c04-4b87-afcb-f99b0a611186",
  },
  95289500000100: {
    distributorName: "DEMEI",
    concessionaireCode: 38,
    codCce: "7280",
    thundersId: "93",
  },
  23664303000104: {
    distributorName: "DME",
    concessionaireCode: 39,
    codCce: "103",
    thundersId: "120",
  },
  28152650000171: {
    distributorName: "EDP ES",
    concessionaireCode: 54,
    codCce: "55",
    thundersId: "102",
  },
  "02302100000106": {
    distributorName: "EDP SP",
    concessionaireCode: 4,
    codCce: "5",
    thundersId: "",
  },
  86531175000140: {
    distributorName: "EFLUL",
    concessionaireCode: 44,
    codCce: "1871",
    thundersId: "107",
  },
  "02328280000197": {
    distributorName: "ELEKTRO",
    concessionaireCode: 45,
    codCce: "46",
    thundersId: "110",
  },
  "02328280000278": {
    distributorName: "ELEKTRO",
    concessionaireCode: 45,
    codCce: "",
    thundersId: "",
  },
  88446034000155: {
    distributorName: "ELETROCAR",
    concessionaireCode: 47,
    codCce: "10469",
    thundersId: "94",
  },
  "07047251000170": {
    distributorName: "ENEL CE",
    concessionaireCode: 29,
    codCce: "31",
    thundersId: "79",
  },
  "01543032000104": {
    distributorName: "ENEL GO",
    concessionaireCode: 12,
    codCce: "15",
    thundersId: "115",
  },
  33050071000158: {
    distributorName: "ENEL RJ",
    concessionaireCode: 3,
    codCce: "24",
    thundersId: "71",
  },
  61695227000193: {
    distributorName: "ENEL SP",
    concessionaireCode: 48,
    codCce: "49",
    thundersId: "98",
  },
  "04065033000170": {
    distributorName: "ENERGISA AC",
    concessionaireCode: 46,
    codCce: "2576",
    thundersId: "127",
  },
  "08826596000195": {
    distributorName: "ENERGISA BORBOREMA",
    concessionaireCode: 53,
    codCce: "",
    thundersId: "70",
  },
  19527639000158: {
    distributorName: "ENERGISA MG",
    concessionaireCode: 50,
    codCce: "8",
    thundersId: "87",
  },
  19527639007837: {
    distributorName: "ENERGISA MINAS RIO",
    concessionaireCode: 50,
    codCce: "",
    thundersId: "",
  },
  15413826000150: {
    distributorName: "ENERGISA MS",
    concessionaireCode: 51,
    codCce: "52",
    thundersId: "72",
  },
  "03467321000199": {
    distributorName: "ENERGISA MT",
    concessionaireCode: 17,
    codCce: "20",
    thundersId: "75",
  },
  33249046000106: {
    distributorName: "ENERGISA NOVA FRIBURGO",
    concessionaireCode: 50,
    codCce: "",
    thundersId: "88",
  },
  "09095183000140": {
    distributorName: "ENERGISA PB",
    concessionaireCode: 53,
    codCce: "68",
    thundersId: "114",
  },
  "05914650000166": {
    distributorName: "ENERGISA RO",
    concessionaireCode: 20,
    codCce: "2556",
    thundersId: "126",
  },
  13017462000163: {
    distributorName: "ENERGISA SE",
    concessionaireCode: 55,
    codCce: "51",
    thundersId: "81",
  },
  "07282377000120": {
    distributorName: "ENERGISA SUL SUDESTE",
    concessionaireCode: 6,
    codCce: "2036",
    thundersId: "83",
  },
  "07282377008104": {
    distributorName: "ENERGISA SUL SUDESTE",
    concessionaireCode: 6,
    codCce: "",
    thundersId: "",
  },
  "07282377007051": {
    distributorName: "ENERGISA SUL SUDESTE",
    concessionaireCode: 6,
    codCce: "",
    thundersId: "",
  },
  25086034000171: {
    distributorName: "ENERGISA TO",
    concessionaireCode: 15,
    codCce: "18",
    thundersId: "97",
  },
  12272084000100: {
    distributorName: "EQUATORIAL AL",
    concessionaireCode: 8,
    codCce: "10",
    thundersId: "111",
  },
  "06272793000184": {
    distributorName: "EQUATORIAL MA",
    concessionaireCode: 16,
    codCce: "19",
    thundersId: "112",
  },
  "04895728000180": {
    distributorName: "EQUATORIAL PA",
    concessionaireCode: 13,
    codCce: "16",
    thundersId: "101",
  },
  "06840748000189": {
    distributorName: "EQUATORIAL PI",
    concessionaireCode: 19,
    codCce: "22",
    thundersId: "113",
  },
  91982348000187: {
    distributorName: "HIDROPAN",
    concessionaireCode: 57,
    codCce: "2119",
    thundersId: "95",
  },
  83855973000130: {
    distributorName: "IGUAÇU",
    concessionaireCode: 58,
    codCce: "146",
    thundersId: "103",
  },
  86301124000122: {
    distributorName: "JOÃO CESA",
    concessionaireCode: 43,
    codCce: "",
    thundersId: "105",
  },
  60444437000146: {
    distributorName: "LIGHT",
    concessionaireCode: 59,
    codCce: "64",
    thundersId: "124",
  },
  97081434000103: {
    distributorName: "MISSÕES",
    concessionaireCode: 93,
    codCce: "59791",
    thundersId: "12281e36-6187-408c-8fd9-c9780a047ae8",
  },
  97578090000134: {
    distributorName: "MUX",
    concessionaireCode: 60,
    codCce: "16405",
    thundersId: "96",
  },
  89889604000144: {
    distributorName: "NOVA PALMA",
    concessionaireCode: null,
    codCce: "16424",
    thundersId: "77",
  },
  79850574000109: {
    distributorName: "PACTO",
    concessionaireCode: 56,
    codCce: "16485",
    thundersId: "109",
  },
  "02016439000138": {
    distributorName: "RGE SUL",
    concessionaireCode: 1,
    codCce: "",
    thundersId: "89",
  },
  "02016440000162": {
    distributorName: "RGE SUL",
    concessionaireCode: 1,
    codCce: "3",
    thundersId: "",
  },
  "02341470000144": {
    distributorName: "RORAIMA",
    concessionaireCode: 5,
    codCce: "12512",
    thundersId: "ce0eb4c5-bcf4-4b8a-b14f-b4ad34188e9c",
  },
  27485069000109: {
    distributorName: "SANTA MARIA",
    concessionaireCode: 49,
    codCce: "8469",
    thundersId: "104",
  },
  13255658000196: {
    distributorName: "SULGIPE",
    concessionaireCode: 62,
    codCce: "10649",
    thundersId: "128",
  },
};

exports.main = async (event, callback) => {
  try {
    const { cnpj_da_distribuidora } = event.inputFields;

    if (!cnpj_da_distribuidora) {
      throw new Error("CNPJ not provided.");
    }

    const distributor =
      distributorsData[cnpj_da_distribuidora.replace(/\D/g, "")];

    if (!distributor) {
      throw new Error("Distributor not found for the provided CNPJ.");
    }

    return await callback({
      outputFields: {
        distributorName: distributor.distributorName,
        concessionaireCode: distributor.concessionaireCode,
        codCce: distributor.codCce,
        thundersId: distributor.thundersId,
      },
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
};
// [FINAL];

exports.main(
  {
    inputFields: {
      cnpj_da_distribuidora: "5/277.7034.0001-90",
    },
    object: { objectId: "" },
  },
  console.log
);
