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

def gerar_dados_atualizados(qtd_ano=50000, aguardando=20):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Limpa o banco (opcional)
    cursor.execute("DELETE FROM tempo_processo")
    cursor.execute("DELETE FROM atendimento")
    cursor.execute("DELETE FROM paciente")
    conn.commit()

    agora = datetime.now()
    ano = agora.year
    start_date = agora - timedelta(days=364)
    dias_no_ano = 365

    # Popula ano todo até ontem
    registros_total = 0
    horarios_pico = [7, 8, 9, 16, 17, 18, 19]
    for i in range(dias_no_ano-1):
        dia = start_date + timedelta(days=i)
        base = 120
        if dia.month in [6, 7, 8]:
            base += random.randint(25, 60)
        if dia.month == 2 and 10 <= dia.day <= 20:
            base += 50
        if dia.weekday() == 6 or is_feriado(dia):
            base = int(base * 0.4)
        elif dia.weekday() == 0 and (is_feriado(dia - timedelta(days=1)) or (dia - timedelta(days=1)).weekday() == 6):
            base += 50
        if dia.month == 12 and dia.day >= 24:
            base = int(base * 0.5)

        for _ in range(base):
            nome = random.choice(NOMES)
            sexo = random.choice(SEXOS)
            ano_nasc = random.randint(1950, 2015)
            mes_nasc = random.randint(1, 12)
            dia_nasc = random.randint(1, 28)
            data_nasc = f"{ano_nasc}-{mes_nasc:02d}-{dia_nasc:02d}"

            cursor.execute(
                "INSERT INTO paciente (nome, data_nascimento, sexo) VALUES (?, ?, ?)",
                (nome, data_nasc, sexo)
            )
            paciente_id = cursor.lastrowid

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

        if registros_total % 2000 == 0:
            conn.commit()
            print(f"{registros_total} registros inseridos...")

    # ATENDIMENTOS DE HOJE (com movimentação durante a apresentação)
    hoje = agora.replace(hour=0, minute=0, second=0, microsecond=0)
    for hora in range(7, 22):  # Das 7h às 21h
        for _ in range(random.randint(6, 15)):
            nome = random.choice(NOMES)
            sexo = random.choice(SEXOS)
            ano_nasc = random.randint(1950, 2015)
            mes_nasc = random.randint(1, 12)
            dia_nasc = random.randint(1, 28)
            data_nasc = f"{ano_nasc}-{mes_nasc:02d}-{dia_nasc:02d}"

            cursor.execute(
                "INSERT INTO paciente (nome, data_nascimento, sexo) VALUES (?, ?, ?)",
                (nome, data_nasc, sexo)
            )
            paciente_id = cursor.lastrowid

            minuto = random.randint(0, 59)
            data_atendimento = hoje + timedelta(hours=hora, minutes=minuto)
            tipo = random.choice(["URGÊNCIA", "AMBULATÓRIO"])
            convenio = random.choices(["SUS", "Unimed", "Particular"], [0.7, 0.2, 0.1])[0]
            cursor.execute(
                "INSERT INTO atendimento (paciente_id, data_atendimento, tipo, convenio) VALUES (?, ?, ?, ?)",
                (paciente_id, data_atendimento, tipo, convenio)
            )
            atendimento_id = cursor.lastrowid

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

    # ATENDIMENTOS FUTUROS: Amanhã (14/07/2024) pra mostrar depois da meia-noite
    amanha = hoje + timedelta(days=1)
    for hora in range(7, 22):  # Das 7h às 21h
        for _ in range(random.randint(6, 12)):
            nome = random.choice(NOMES)
            sexo = random.choice(SEXOS)
            ano_nasc = random.randint(1950, 2015)
            mes_nasc = random.randint(1, 12)
            dia_nasc = random.randint(1, 28)
            data_nasc = f"{ano_nasc}-{mes_nasc:02d}-{dia_nasc:02d}"

            cursor.execute(
                "INSERT INTO paciente (nome, data_nascimento, sexo) VALUES (?, ?, ?)",
                (nome, data_nasc, sexo)
            )
            paciente_id = cursor.lastrowid

            minuto = random.randint(0, 59)
            data_atendimento = amanha + timedelta(hours=hora, minutes=minuto)
            tipo = random.choice(["URGÊNCIA", "AMBULATÓRIO"])
            convenio = random.choices(["SUS", "Unimed", "Particular"], [0.7, 0.2, 0.1])[0]
            cursor.execute(
                "INSERT INTO atendimento (paciente_id, data_atendimento, tipo, convenio) VALUES (?, ?, ?, ?)",
                (paciente_id, data_atendimento, tipo, convenio)
            )
            atendimento_id = cursor.lastrowid

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

    # PACIENTES AGUARDANDO (sem INICIO_MEDICO, nos últimos 2h)
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

        data_atendimento = agora - timedelta(minutes=random.randint(5, 120))
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
    print(f"Banco populado com dados até {agora}, com {aguardando} aguardando!")

if __name__ == "__main__":
    gerar_dados_atualizados(qtd_ano=50000, aguardando=20)
