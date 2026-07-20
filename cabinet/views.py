
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib.auth.models import User 
from main.models import Profile
from django.contrib.auth import update_session_auth_hash

#Функция для определение роли пользователя
def get_cabinet_context(user):
    if hasattr(user, 'profile'):

        account_type = user.profile.account_type
    else:
        account_type = 'client_person'
    
    if account_type == 'supplier':
        label = 'Поставщик'
        zone = 'Зона поставщика'
    elif account_type == 'client_person':
        label = 'Физическое лицо'
        zone = 'Клиентская зона'
    elif account_type == 'client_company':
        label = 'Компания'
        zone = 'Клиентская зона'
    else:
        label = 'Физическое лицо'
        zone = 'Клиентская зона'

    
    return {
        'cabinet_account_type': account_type,
        'label': label,
        'zone': zone,
    }

@login_required
def profile(request):
    account_type = get_cabinet_context(request.user)

    return render(request, 'cabinet/profile.html', {
        'user': request.user,
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
        })

@login_required
def requests(request):
    leads = request.user.leads.all().order_by('-created_at')
    account_type = get_cabinet_context(request.user)
    return render(request, 'cabinet/requests.html', {
        'leads': leads,
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
        })

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('cabinet:profile')
        else:
            messages.error(request, 'невреный логин или пароль')
    return render(request, 'cabinet/login.html')

#Обработка регистрации 
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
import re

def check_email(email_string):
    try:
        validate_email(email_string)
        return True
    except ValidationError:
        return False

def check_phone(phone):
    
    phone_clean = re.sub(r'\D', '', phone)
    if phone_clean == "":
        return False
    if phone_clean[0] == "8" and len(phone_clean) == 11:
        phone_clean = '7' + phone_clean[1:]
    if phone_clean[0] == '9' and len(phone_clean) == 10:
        phone_clean = '7' + phone_clean
    if len(phone_clean) == 11 and phone_clean[0] == '7':
        phone_clean = '+' + phone_clean
        return phone_clean
    return False


def register(request):

    if request.method == 'POST':
        account_type = request.POST.get('account_type')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        first_name = request.POST.get('first_name')
        phone = request.POST.get('phone')
        company_name = request.POST.get('company_name')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')
        
        types = ['client_person', 'client_company', 'supplier']

        if email == None:
            messages.error(request, 'email введен не правильно ')
            return render(request, 'cabinet/register.html')
        email = email.strip()
        
        if password1 == None or password1.strip() == "" or password1 != password2:
            messages.error(request, 'Пароли не совпадают')
            return render(request, 'cabinet/register.html')
       
        
        if first_name == None or first_name.strip() == "": 
            messages.error(request, 'Поле введено не верно')
            return render(request, 'cabinet/register.html')
        

        if email == "" or check_email(email) == False:
            messages.error(request, 'Поле введено не верно')
            return render(request, 'cabinet/register.html')
        
        if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
            messages.error(request, "Такой email уже используется")
            return render(request, 'cabinet/register.html')
        
        if phone == None or phone.strip() == '' or check_phone(phone) == False:
            messages.error(request, 'Поле введено не верно')
            return render(request, 'cabinet/register.html')
        
        if account_type not in types:
            messages.error(request, 'Поле заполненно неверно')
            return render(request, 'cabinet/register.html')
        
        if account_type == 'client_company' or account_type == 'supplier':
            if company_name == None or company_name.strip() == "":
                messages.error(request, 'Поле не заполненно')
                return render(request, 'cabinet/register.html')
            

        if account_type == 'client_person':
            company_name = ''

        if 'consent' not in request.POST or request.POST.get('consent') == '0':
            messages.error(request, 'Не нажата галочка обработки данных')
            return render(request, 'cabinet/register.html')
        
        if last_name == None:
            last_name = ''

        if request.POST.get('consent') == '1':


            user = User.objects.create_user(
                last_name=last_name.strip(),
                email=email,
                first_name=first_name.strip(),
                password=password1.strip(),
                username=email.strip()
            )
            Profile.objects.create(
                user=user,
                account_type=account_type.strip(),
                phone=check_phone(phone),
                company_name=company_name.strip()
            )

            login(request, user)
            return redirect('cabinet:profile')
        else:
            messages.error(request, 'Не нажата галочка обработки данных')
            return render(request, 'cabinet/register.html')


    return render(request, 'cabinet/register.html')

def logout_view(request):
    logout(request)
    return redirect('cabinet:login')




#Функция редактирвоания личного кабинета 
@login_required
def edit(request):

    if request.method == 'POST':
        user = request.user
        account_type = get_cabinet_context(request.user)


        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        phone = request.POST.get('phone')
        current_password = request.POST.get('current_password')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')

        if first_name == None or first_name.strip() == "":
            messages.error(request, 'Поле заполнено не верно')
            return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })
        
        if email == None:
            messages.error(request, 'email введен не правильно ')
            return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })
        email = email.strip()


        if email == "" or check_email(email) == False:
            messages.error(request, 'Поле введено не верно')
            return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })
        
        if User.objects.filter(email=email).exclude(id=request.user.id).exists() or User.objects.filter(username=email).exclude(id=request.user.id).exists():
            messages.error(request, 'Email занят другим пользователем')
            return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })
        
        if phone == None or phone.strip() == '' or check_phone(phone) == False:
            messages.error(request, 'Поле введено не верно')
            return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })
        if last_name == None:
            last_name = ""
        
        #Отдельный блок для проверки на смену пароля
        current_password_req = current_password or password1 or password2
        if current_password_req:
            if not current_password:
                messages.error(request, 'Введите текущий пароль')
                return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })
            elif not request.user.check_password(current_password):
                messages.error(request, "Текущий пароль неверный")
                return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })
            
            if not password1:
                messages.error(request, "Введите новый пароль")
                return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })
            if not password2:
                messages.error(request, "Повторите новый пароль") 
                return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })

            if password1 and password2 and password1 != password2:
                messages.error(request, "Пароли не совпадают")
                return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })
            user = request.user
            user.set_password(password1)
            update_session_auth_hash(request, user)
        profile, created = Profile.objects.get_or_create(user=user)
        
        user.first_name = first_name.strip()
        user.last_name = last_name.strip()
        user.email = email
        profile.phone = check_phone(phone)
        user.username = email
        user.save()
        profile.save()
        return redirect('cabinet:profile')



        
    account_type = get_cabinet_context(request.user)
    return render(request, 'cabinet/edit.html', {
        'cabinet_account_type': account_type['cabinet_account_type'],
        'cabinet_account_label': account_type['label'],
        'cabinet_zone_label': account_type['zone']
    })




