import { ModelId, ModelResponse } from "@/types/chat";

const MOCK_RESPONSES: Record<ModelId, (prompt: string) => string> = {
  gemini: (prompt) => `## Gemini Pro Response

Here's my approach to: *${prompt}*

\`\`\`abap
" ABAP: Optimized Internal Table Processing
DATA: lt_materials TYPE TABLE OF mara,
      ls_material TYPE mara.

SELECT matnr, mtart, mbrsh, matkl
  FROM mara
  INTO TABLE @lt_materials
  WHERE mtart = 'FERT'
  ORDER BY matnr.

LOOP AT lt_materials INTO ls_material
  WHERE matkl IS NOT INITIAL.
  " Process each finished material
  WRITE: / ls_material-matnr, ls_material-matkl.
ENDLOOP.

" Using REDUCE for aggregation
DATA(lv_count) = REDUCE i(
  INIT x = 0
  FOR wa IN lt_materials
  WHERE ( mbrsh = 'M' )
  NEXT x = x + 1 ).
\`\`\`

This uses **modern ABAP syntax** with inline declarations and the \`REDUCE\` operator for efficient aggregation.`,

  claude: (prompt) => `## Claude Analysis

Regarding: *${prompt}*

I'd recommend a structured approach using **SAP CAP** with clean separation:

\`\`\`javascript
// srv/material-service.js
const cds = require('@sap/cds');

class MaterialService extends cds.ApplicationService {
  async init() {
    const { Materials, Orders } = this.entities;

    this.on('READ', Materials, async (req) => {
      const query = SELECT.from(Materials)
        .columns('ID', 'name', 'category', 'stock')
        .where({ status: 'active' })
        .orderBy('name asc')
        .limit(req.query.SELECT.limit?.rows?.val || 100);

      return cds.run(query);
    });

    this.on('optimizeStock', async (req) => {
      const { materialId } = req.data;
      const material = await SELECT.one.from(Materials, materialId);
      
      if (!material) req.reject(404, 'Material not found');
      
      const optimizedQty = calculateOptimal(material.stock, material.demand);
      await UPDATE(Materials, materialId).set({ stock: optimizedQty });
      
      return { materialId, newStock: optimizedQty };
    });

    await super.init();
  }
}

module.exports = MaterialService;
\`\`\`

Key advantages: type-safe queries, built-in validation, automatic OData exposure.`,

  gpt4o: (prompt) => `## GPT-4o Solution

For: *${prompt}*

Here's a **full-stack approach** combining ABAP and Node.js:

\`\`\`abap
" ABAP: RFC-enabled Function Module
FUNCTION Z_GET_MATERIAL_DATA.
*"----------------------------------------------------------------------
*"  IMPORTING
*"     VALUE(IV_MATNR) TYPE MATNR
*"  EXPORTING
*"     VALUE(ES_MATERIAL) TYPE ZMATERIAL_S
*"  EXCEPTIONS
*"     NOT_FOUND
*"----------------------------------------------------------------------

  SELECT SINGLE *
    FROM mara
    INTO CORRESPONDING FIELDS OF es_material
    WHERE matnr = iv_matnr.

  IF sy-subrc <> 0.
    RAISE not_found.
  ENDIF.

  " Enrich with additional data
  SELECT SINGLE maktx
    FROM makt
    INTO es_material-description
    WHERE matnr = iv_matnr
      AND spras = sy-langu.

ENDFUNCTION.
\`\`\`

\`\`\`javascript
// Node.js: Consuming via SAP Cloud SDK
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');

async function getMaterial(materialId) {
  try {
    const response = await executeHttpRequest(
      { destinationName: 'S4HANA' },
      {
        method: 'GET',
        url: \`/sap/opu/odata/sap/API_MATERIAL/A_Material('\${materialId}')\`,
        headers: { Accept: 'application/json' }
      }
    );
    return response.data.d;
  } catch (error) {
    console.error('Material fetch failed:', error.message);
    throw error;
  }
}
\`\`\`

This pattern enables **clean integration** between on-premise ABAP and cloud Node.js services.`,

  azure: (prompt) => `## Azure Copilot Suggestion

Analyzing: *${prompt}*

Leveraging **Azure OpenAI + SAP BTP** integration:

\`\`\`typescript
// Azure Function: AI-Enhanced Material Processing
import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { OpenAIClient, AzureKeyCredential } from "@azure/openai";

interface MaterialAnalysis {
  materialId: string;
  recommendation: string;
  confidence: number;
}

app.http('analyzeMaterial', {
  methods: ['POST'],
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const { prompt, materialData } = await req.json() as {
      prompt: string;
      materialData: Record<string, unknown>;
    };

    const client = new OpenAIClient(
      process.env.AZURE_OPENAI_ENDPOINT!,
      new AzureKeyCredential(process.env.AZURE_OPENAI_KEY!)
    );

    const completion = await client.getChatCompletions(
      "gpt-4o",
      [
        { role: "system", content: "You are an SAP materials expert." },
        { role: "user", content: \`\${prompt}\\nData: \${JSON.stringify(materialData)}\` }
      ]
    );

    const analysis: MaterialAnalysis = {
      materialId: materialData.id as string,
      recommendation: completion.choices[0].message?.content || "",
      confidence: 0.92
    };

    return { jsonBody: analysis };
  }
});
\`\`\`

This integrates **Azure cognitive services** directly with SAP BTP destinations for enterprise-grade AI workflows.`,
};

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function generateMultiModelResponse(
  prompt: string
): Promise<ModelResponse[]> {
  const modelIds: ModelId[] = ["gemini", "claude", "gpt4o", "azure"];

  const promises = modelIds.map(
    (modelId) =>
      new Promise<ModelResponse>((resolve) => {
        const delay = randomDelay(800, 2500);
        setTimeout(() => {
          resolve({
            modelId,
            content: MOCK_RESPONSES[modelId](prompt),
            latency: delay,
          });
        }, delay);
      })
  );

  return Promise.all(promises);
}

export async function sendChatMessage(
  _modelId: ModelId,
  prompt: string,
  _history: { role: string; content: string }[]
): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        `## Follow-up Response\n\nRegarding: *${prompt}*\n\n\`\`\`javascript\n// Additional implementation detail\nconst result = await processRequest({\n  query: "${prompt.slice(0, 30)}...",\n  timestamp: new Date().toISOString(),\n  status: "completed"\n});\n\nconsole.log("Processed:", result.id);\n\`\`\`\n\nLet me know if you need further clarification on any part of this implementation.`
      );
    }, randomDelay(600, 1500));
  });
}
