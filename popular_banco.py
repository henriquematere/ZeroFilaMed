import sqlite3
from datetime import datetime, timedelta
import random

DB_FILE = "zerofilamed.db"

NOMES = [
    "Maria Oliveira", "João Silva", "Ana Costa", "Pedro Souza", "Lucas Pereira",
    "Carla Ramos", "Juliana Lima", "Marcos Alves", "Paula Gonçalves", "José Melo"
]
SEXOS = ["M", "F"]

FERIADOS = [
    (1, 1),     # Ano Novo
    (2, 12),    # Carnaval
    (4, 21),    # Tiradentes
    (5, 1),     # Dia do Trabalho
    (9, 7),     # Independência
    (10, 12),   # N. Sra Aparecida
    (11, 2),    # Finados
    (11, 15),   # Proclamação República
    (12, 25),   # Natal
]

def is_feriado(dt):
    return (dt.month, dt.day) in FERIADOS

def gerar_dados_ricos(qtd_ano=80000, aguardando=30):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Limpa o banco (opcional)
    cursor.execute("DELETE FROM tempo_processo")
    cursor.execute("DELETE FROM atendimento")
    cursor.execute("DELETE FROM paciente")
    conn.commit()

    dias_no_ano = 366 if datetime.now().year % 4 == 0 else 365
    # Distribui pacientes pelo ano conforme sazonalidade
    base_dias = []
    dias_no_ano = 365
    start_date = datetime.now() - timedelta(days=dias_no_ano - 1)
    for i in range(dias_no_ano):
        dia = start_date + timedelta(days=i)
        base = 180  # base de atendimentos por dia (~180*365 = 65mil, ajuste para 80k)
        # Mais no inverno
        if dia.month in [6, 7, 8]:
            base += random.randint(30, 70)
        # Carnaval
        if dia.month == 2 and 10 <= dia.day <= 20:
            base += 50
        # Domingo ou feriado = menos
        if dia.weekday() == 6 or is_feriado(dia):
            base = int(base * 0.4)
        # Segunda pós feriado ou domingo
        elif dia.weekday() == 0 and (is_feriado(dia - timedelta(days=1)) or (dia - timedelta(days=1)).weekday() == 6):
            base += 50
        # Natal/Ano Novo
        if dia.month == 12 and dia.day >= 24:
            base = int(base * 0.5)
        base_dias.append((dia, base))

    registros_total = 0
    horarios_pico = [7, 8, 9, 16, 17, 18, 19]
    for dia, base in base_dias:
        for _ in range(base):
            nome = random.choice(NOMES)
            sexo = random.choice(SEXOS)
            ano = random.randint(1950, 2015)
            mes_nasc = random.randint(1, 12)
            dia_nasc = random.randint(1, 28)
            data_nasc = f"{ano}-{mes_nasc:02d}-{dia_nasc:02d}"

            # Insere paciente
            cursor.execute(
                "INSERT INTO paciente (nome, data_nascimento, sexo) VALUES (?, ?, ?)",
                (nome, data_nasc, sexo)
            )
            paciente_id = cursor.lastrowid

            # Horário aleatório, mas metade nos horários de pico
            if random.random() < 0.6:
                hora = random.choice(horarios_pico)
            else:
                hora = random.randint(0, 23)
            minuto = random.randint(0, 59)
            data_atendimento = datetime(dia.year, dia.month, dia.day, hora, minuto)
            tipo = random.choice(["URGÊNCIA", "AMBULATÓRIO"])
            convenio = random.choices(["SUS", "Unimed", "Particular"], [0.7, 0.2, 0.1])[0]
            cursor.execute(
                "INSERT INTO atendimento (paciente_id, data_atendimento, tipo, convenio) VALUES (?, ?, ?, ?)",
                (paciente_id, data_atendimento, tipo, convenio)
            )
            atendimento_id = cursor.lastrowid

            # Espera e consulta variando conforme convênio/dia/horário
            if convenio == "SUS":
                espera_senha = random.randint(5, 30)
                espera_medico = random.randint(10, 40)
            else:
                espera_senha = random.randint(2, 10)
                espera_medico = random.randint(5, 20)
            espera_triagem = random.randint(2, 12)
            tempo_triagem = random.randint(5, 16)
            tempo_consulta = random.randint(10, 26)
            tempo_alta = random.randint(1, 10)

            eventos = [
                ("RETIRADA_SENHA", data_atendimento),
                ("CHAMADA_RECEPCAO", data_atendimento + timedelta(minutes=espera_senha)),
                ("INICIO_TRIAGEM", data_atendimento + timedelta(minutes=espera_senha + espera_triagem)),
                ("FIM_TRIAGEM", data_atendimento + timedelta(minutes=espera_senha + espera_triagem + tempo_triagem)),
                ("CHAMADA_MEDICO", data_atendimento + timedelta(minutes=espera_senha + espera_triagem + tempo_triagem + espera_medico)),
                ("INICIO_MEDICO", data_atendimento + timedelta(minutes=espera_senha + espera_triagem + tempo_triagem + espera_medico)),
                ("FIM_MEDICO", data_atendimento + timedelta(minutes=espera_senha + espera_triagem + tempo_triagem + espera_medico + tempo_consulta)),
                ("ALTA", data_atendimento + timedelta(minutes=espera_senha + espera_triagem + tempo_triagem + espera_medico + tempo_consulta + tempo_alta)),
            ]
            for tipo_proc, data_proc in eventos:
                cursor.execute(
                    "INSERT INTO tempo_processo (atendimento_id, tipo_processo, data_hora) VALUES (?, ?, ?)",
                    (atendimento_id, tipo_proc, data_proc)
                )
            registros_total += 1

        # Faz commit a cada 2000 dias (evita travar o SQLite)
        if registros_total % 2000 == 0:
            conn.commit()
            print(f"{registros_total} registros inseridos...")

    # Adiciona pacientes aguardando atualmente (apenas RETIRADA_SENHA, aguardando)
    agora = datetime.now()
    for _ in range(aguardando):
        nome = random.choice(NOMES)
        sexo = random.choice(SEXOS)
        ano = random.randint(1950, 2015)
        mes_nasc = random.randint(1, 12)
        dia_nasc = random.randint(1, 28)
        data_nasc = f"{ano}-{mes_nasc:02d}-{dia_nasc:02d}"
        cursor.execute(
            "INSERT INTO paciente (nome, data_nascimento, sexo) VALUES (?, ?, ?)",
            (nome, data_nasc, sexo)
        )
        paciente_id = cursor.lastrowid

        data_atendimento = agora - timedelta(minutes=random.randint(1, 120))
        tipo = random.choice(["URGÊNCIA", "AMBULATÓRIO"])
        convenio = random.choices(["SUS", "Unimed", "Particular"], [0.7, 0.2, 0.1])[0]
        cursor.execute(
            "INSERT INTO atendimento (paciente_id, data_atendimento, tipo, convenio) VALUES (?, ?, ?, ?)",
            (paciente_id, data_atendimento, tipo, convenio)
        )
        atendimento_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO tempo_processo (atendimento_id, tipo_processo, data_hora) VALUES (?, ?, ?)",
            (atendimento_id, "RETIRADA_SENHA", data_atendimento)
        )

    conn.commit()
    conn.close()
    print(f"Banco populado com {registros_total} atendimentos e {aguardando} aguardando!")

if __name__ == "__main__":
    gerar_dados_ricos(qtd_ano=80000, aguardando=30)  # Ajuste para gerar mais/menos
