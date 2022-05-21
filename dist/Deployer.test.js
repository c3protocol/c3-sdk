"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Deployer_1 = require("./Deployer");
describe('Compile Stateless Contract', function () {
    it('Simple dynamic statess contract', function () {
        const sourceCode = `
            #pragma version 2
            byte TMPL_S_TEST
            pop
            byte TMPL_S_TEST
            pop
            addr TMPL_A_ADR
            pop
            int TMPL_I_RETURN
				`;
        const expectedParsedCode = `
            #pragma version 2
            byte "Test Value"
            pop
            byte "Test Value"
            pop
            addr 5UBH7BW5E4UOAVTMKNQ2GUXTHETSM4JBAGCU6RNXYSEVZE2KNGFW3CICCI
            pop
            int 123
				`;
        const subMap = new Map();
        subMap.set('TMPL_S_TEST', 'Test Value');
        subMap.set('TMPL_A_ADR', '5UBH7BW5E4UOAVTMKNQ2GUXTHETSM4JBAGCU6RNXYSEVZE2KNGFW3CICCI');
        subMap.set('TMPL_I_RETURN', 123);
        const [parsedCode, parameters] = Deployer_1.Deployer.parseCode(sourceCode, subMap);
        expect(parsedCode).toBe(expectedParsedCode);
        expect(parameters).toHaveLength(3);
        expect(parameters[0].name).toBe('TEST');
        expect(parameters[0].type).toBe(Deployer_1.FieldType.STRING);
        expect(parameters[1].name).toBe('ADR');
        expect(parameters[1].type).toBe(Deployer_1.FieldType.ADDRESS);
        expect(parameters[2].name).toBe('RETURN');
        expect(parameters[2].type).toBe(Deployer_1.FieldType.UINT);
    });
});
//# sourceMappingURL=Deployer.test.js.map